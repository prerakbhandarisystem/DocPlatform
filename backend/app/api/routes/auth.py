"""
Authentication API routes
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleAuthRequest,
    GoogleAuthResponse,
    RefreshTokenRequest,
    Token,
    UserResponse,
)
from app.services.auth_service import auth_service

logger = structlog.get_logger()

router = APIRouter(tags=["authentication"])


# Dependency to extract JWT token from Authorization header
async def get_token_from_header(authorization: str = Header(None)) -> str:
    """Extract JWT token from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return token
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Dependency to get current user from JWT token
async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(get_token_from_header)
) -> User:
    """Dependency to get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token_data = auth_service.verify_token(token)
        if token_data is None or token_data.user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    user = auth_service.get_user_by_id(db, token_data.user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user


@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(
    auth_request: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with Google OAuth.
    
    This endpoint receives a Google ID token from the frontend,
    verifies it with Google, and returns user information along with
    JWT tokens for subsequent API calls.
    """
    try:
        result = await auth_service.authenticate_with_google(
            db, auth_request.credential
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google credential"
            )
        
        user, tokens = result
        
        # Convert SQLAlchemy model to Pydantic model
        user_response = UserResponse.from_orm(user)
        token_response = Token(**tokens)
        
        return GoogleAuthResponse(
            user=user_response,
            token=token_response
        )
        
    except Exception as e:
        logger.error("Google authentication failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    
    When the access token expires, this endpoint can be used to get
    a new access token without requiring the user to sign in again.
    """
    try:
        new_tokens = auth_service.refresh_access_token(refresh_request.refresh_token)
        
        if not new_tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        return Token(**new_tokens)
        
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout():
    """
    Logout user.
    
    Since we're using stateless JWT tokens, logout is handled
    on the client side by removing the tokens from storage.
    This endpoint is provided for consistency and can be used
    for logging purposes.
    """
    logger.info("User logged out")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    
    This endpoint returns the profile information of the
    currently authenticated user based on the JWT token.
    """
    return UserResponse.from_orm(current_user) 