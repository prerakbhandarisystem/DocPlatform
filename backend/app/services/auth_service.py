"""
Authentication service for Google OAuth and JWT token management
"""

import json
from datetime import datetime, timedelta
from typing import Optional

import structlog
from google.auth.transport import requests
from google.oauth2 import id_token
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.schemas.auth import TokenData, UserCreate

logger = structlog.get_logger()


class AuthService:
    """Authentication service for Google OAuth and JWT management."""

    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a new JWT access token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        """Create a new JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str, token_type: str = "access") -> Optional[TokenData]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("type") != token_type:
                logger.warning("Invalid token type", expected=token_type, actual=payload.get("type"))
                return None
            
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            
            if user_id is None:
                logger.warning("Token missing user_id")
                return None
                
            token_data = TokenData(user_id=user_id, email=email)
            return token_data
            
        except JWTError as e:
            logger.warning("JWT verification failed", error=str(e))
            return None

    async def verify_google_token(self, credential: str) -> Optional[dict]:
        """Verify Google ID token and return user info."""
        logger.info("Starting Google token verification", token_preview=credential[:20] + "...")
        
        try:
            # Verify the token with Google
            logger.debug("Calling Google token verification API", client_id=settings.GOOGLE_CLIENT_ID[:10] + "...")
            
            idinfo = id_token.verify_oauth2_token(
                credential, 
                requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            
            logger.debug("Google API response received", issuer=idinfo.get('iss'), sub=idinfo.get('sub'))

            # Check if token is from correct issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                logger.warning("Invalid token issuer", issuer=idinfo['iss'])
                return None

            # Extract user information
            user_info = {
                'google_id': idinfo['sub'],
                'email': idinfo['email'],
                'full_name': idinfo.get('name', ''),
                'avatar_url': idinfo.get('picture', ''),
                'email_verified': idinfo.get('email_verified', False)
            }

            logger.info("Google token verified successfully", email=user_info['email'])
            return user_info

        except ValueError as e:
            logger.error("Google token verification failed", 
                        error=str(e), 
                        error_type=type(e).__name__,
                        client_id_set=bool(settings.GOOGLE_CLIENT_ID))
            return None
        except Exception as e:
            logger.error("Unexpected error during token verification", 
                        error=str(e), 
                        error_type=type(e).__name__)
            return None

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email address."""
        return db.query(User).filter(User.email == email).first()

    def get_user_by_google_id(self, db: Session, google_id: str) -> Optional[User]:
        """Get user by Google ID."""
        return db.query(User).filter(User.google_id == google_id).first()

    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    def create_user(self, db: Session, user_create: UserCreate) -> User:
        """Create a new user in the database."""
        db_user = User(
            email=user_create.email,
            full_name=user_create.full_name,
            avatar_url=user_create.avatar_url,
            google_id=user_create.google_id,
            is_active=user_create.is_active,
            last_login=datetime.utcnow()
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info("User created successfully", user_id=str(db_user.id), email=db_user.email)
        return db_user

    def update_user_login(self, db: Session, user: User) -> User:
        """Update user's last login timestamp."""
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    async def authenticate_with_google(self, db: Session, credential: str) -> Optional[tuple[User, dict]]:
        """Authenticate user with Google OAuth and return user and tokens."""
        # Verify Google token
        google_user_info = await self.verify_google_token(credential)
        if not google_user_info:
            return None

        # Check if user exists by Google ID
        user = self.get_user_by_google_id(db, google_user_info['google_id'])
        
        if not user:
            # Check if user exists by email
            user = self.get_user_by_email(db, google_user_info['email'])
            
            if user:
                # Update existing user with Google ID
                user.google_id = google_user_info['google_id']
                user.avatar_url = google_user_info.get('avatar_url', user.avatar_url)
                db.commit()
                db.refresh(user)
                logger.info("Updated existing user with Google ID", user_id=str(user.id))
            else:
                # Create new user
                user_create = UserCreate(
                    email=google_user_info['email'],
                    full_name=google_user_info['full_name'],
                    avatar_url=google_user_info['avatar_url'],
                    google_id=google_user_info['google_id']
                )
                user = self.create_user(db, user_create)

        # Update last login
        user = self.update_user_login(db, user)

        # Create tokens
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(token_data)

        tokens = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60
        }

        logger.info("User authenticated successfully", user_id=str(user.id), email=user.email)
        return user, tokens

    def refresh_access_token(self, refresh_token: str) -> Optional[dict]:
        """Generate new access token from refresh token."""
        token_data = self.verify_token(refresh_token, "refresh")
        if not token_data:
            return None

        # Create new access token
        new_token_data = {"sub": token_data.user_id, "email": token_data.email}
        access_token = self.create_access_token(new_token_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60
        }


# Create global instance
auth_service = AuthService() 