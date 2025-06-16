"""
Configuration management for DocPlatform Backend
"""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "DocPlatform"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="Environment (development, staging, production)")
    DEBUG: bool = Field(default=True, description="Debug mode")
    SECRET_KEY: str = Field(..., description="Secret key for JWT tokens")
    
    # Server
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    ALLOWED_HOSTS: List[str] = Field(default=["*"], description="Allowed hosts")
    CORS_ORIGINS: List[str] = Field(default=["http://localhost:3000"], description="CORS origins")
    
    # Database
    DATABASE_URL: str = Field(..., description="Database URL")
    DATABASE_POOL_SIZE: int = Field(default=20, description="Database connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=30, description="Database max overflow connections")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis URL")
    REDIS_CACHE_TTL: int = Field(default=3600, description="Redis cache TTL in seconds")
    
    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1", description="Celery broker URL")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2", description="Celery result backend")
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, description="AWS access key ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, description="AWS secret access key")
    AWS_REGION: str = Field(default="us-east-1", description="AWS region")
    AWS_S3_BUCKET: str = Field(default="docplatform-documents", description="S3 bucket for documents")
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API key")
    OPENAI_MODEL: str = Field(default="gpt-4", description="OpenAI model to use")
    OPENAI_MAX_TOKENS: int = Field(default=2000, description="OpenAI max tokens")
    OPENAI_TEMPERATURE: float = Field(default=0.1, description="OpenAI temperature")
    
    # Google AI (Gemini)
    GOOGLE_AI_API_KEY: Optional[str] = Field(default=None, description="Google AI Studio API key")
    GOOGLE_AI_MODEL: str = Field(default="gemini-1.5-flash", description="Google AI model to use")
    GOOGLE_AI_MAX_TOKENS: int = Field(default=2000, description="Google AI max tokens")
    GOOGLE_AI_TEMPERATURE: float = Field(default=0.7, description="Google AI temperature")
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None, description="Google OAuth client ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None, description="Google OAuth client secret")
    GOOGLE_REDIRECT_URI: str = Field(
        default="http://localhost:3000/auth/callback,http://localhost:3001/auth/callback",
        description="Comma-separated list of Google OAuth redirect URIs"
    )
    
    # Salesforce
    SALESFORCE_CLIENT_ID: Optional[str] = Field(default=None, description="Salesforce client ID")
    SALESFORCE_CLIENT_SECRET: Optional[str] = Field(default=None, description="Salesforce client secret")
    SALESFORCE_USERNAME: Optional[str] = Field(default=None, description="Salesforce username")
    SALESFORCE_PASSWORD: Optional[str] = Field(default=None, description="Salesforce password")
    SALESFORCE_SECURITY_TOKEN: Optional[str] = Field(default=None, description="Salesforce security token")
    SALESFORCE_DOMAIN: str = Field(default="login", description="Salesforce domain (login or test)")
    
    # Document Processing
    MAX_FILE_SIZE: int = Field(default=50 * 1024 * 1024, description="Max file size in bytes (50MB)")
    ALLOWED_FILE_TYPES: List[str] = Field(
        default=["pdf", "docx", "doc", "txt", "xlsx", "xls"],
        description="Allowed file extensions"
    )
    DOCUMENT_STORAGE_PATH: str = Field(default="./storage/documents", description="Local document storage path")
    TEMPLATE_STORAGE_PATH: str = Field(default="./storage/templates", description="Local template storage path")
    
    # Background Jobs
    MAX_CONCURRENT_JOBS: int = Field(default=10, description="Maximum concurrent background jobs")
    JOB_TIMEOUT: int = Field(default=3600, description="Job timeout in seconds")
    
    # Security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Access token expiration time")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token expiration time")
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    
    # Logging
    LOG_LEVEL: str = "DEBUG"
    LOG_FORMAT: str = Field(default="json", description="Log format (json or plain)")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        """Validate environment value."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of {allowed}")
        return v
    
    @validator("DEBUG")
    def validate_debug(cls, v, values):
        """Disable debug in production."""
        if values.get("ENVIRONMENT") == "production" and v:
            return False
        return v
    
    @validator("CORS_ORIGINS", pre=True)
    def validate_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("ALLOWED_HOSTS", pre=True)
    def validate_allowed_hosts(cls, v):
        """Parse allowed hosts from string or list."""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    @validator("ALLOWED_FILE_TYPES", pre=True)
    def validate_allowed_file_types(cls, v):
        """Parse allowed file types from string or list."""
        if isinstance(v, str):
            return [ext.strip().lower() for ext in v.split(",")]
        return [ext.lower() for ext in v]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields (like BOM characters)


class DevelopmentSettings(Settings):
    """Development environment settings."""
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    # Provide defaults for development
    SECRET_KEY: str = Field(default="dev-secret-key-change-in-production", description="Secret key for JWT tokens")
    DATABASE_URL: str = Field(default="sqlite:///./storage/docplatform.db", description="Database URL")


class StagingSettings(Settings):
    """Staging environment settings."""
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"


class ProductionSettings(Settings):
    """Production environment settings."""
    DEBUG: bool = False
    LOG_LEVEL: str = "WARNING"
    CORS_ORIGINS: List[str] = []  # Should be explicitly set in production


@lru_cache()
def get_settings() -> Settings:
    """Get application settings based on environment."""
    environment = os.getenv("ENVIRONMENT", "development").lower()
    
    settings_map = {
        "development": DevelopmentSettings,
        "staging": StagingSettings,
        "production": ProductionSettings,
    }
    
    settings_class = settings_map.get(environment, DevelopmentSettings)
    return settings_class()


# Export the settings instance
settings = get_settings() 