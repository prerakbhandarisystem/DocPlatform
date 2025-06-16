"""
Authentication schemas for request/response validation
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: str
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a new user."""
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response data."""
    id: UUID
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Schema for token payload data."""
    user_id: Optional[str] = None
    email: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth authentication request."""
    credential: str = Field(..., description="Google ID token from frontend")


class GoogleAuthResponse(BaseModel):
    """Schema for Google OAuth authentication response."""
    user: UserResponse
    token: Token


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""
    refresh_token: str


class AuthCallbackRequest(BaseModel):
    """Schema for OAuth callback request."""
    code: str
    state: Optional[str] = None 