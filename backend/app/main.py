"""
DocPlatform Backend - Main FastAPI Application
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.core.database import database_manager
from app.core.logging import setup_logging
from app.api.routes import api_router

# Setup structured logging
setup_logging()
logger = structlog.get_logger()

# Get application settings
settings = get_settings()


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests and responses."""
    
    async def dispatch(self, request: Request, call_next):
        # Get request body for auth endpoints
        body = None
        if request.url.path.startswith("/api/v1/auth"):
            body = await request.body()
            # Create new request with body
            request = Request(request.scope, lambda: body)
        
        # Log request with body preview for auth endpoints
        logger.info(
            "Request started",
            method=request.method,
            url=str(request.url),
            headers=dict(request.headers),
            body_preview=body[:100] if body else None,
            user_agent=request.headers.get("user-agent"),
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Log response
            logger.info(
                "Request completed",
                method=request.method,
                url=str(request.url),
                status_code=response.status_code,
            )
            
            return response
        except Exception as exc:
            logger.error(
                "Request failed",
                method=request.method,
                url=str(request.url),
                error=str(exc),
            )
            raise


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle application startup and shutdown."""
    
    # Startup
    logger.info("Starting DocPlatform Backend")
    
    # Initialize database
    await database_manager.initialize()
    logger.info("Database initialized")
    
    # Create database tables
    database_manager.create_tables()
    logger.info("Database tables created")
    
    # Initialize AI services
    from app.services.ai_service import ai_service
    await ai_service.initialize()
    logger.info("AI services initialized")
    
    # Initialize Salesforce client
    from app.services.salesforce_service import salesforce_service
    await salesforce_service.initialize()
    logger.info("Salesforce service initialized")
    
    # Initialize Template service
    from app.services.template_service import template_service
    await template_service.initialize()
    logger.info("Template service initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down DocPlatform Backend")
    
    # Close database connections
    await database_manager.close()
    logger.info("Database connections closed")


def create_application() -> FastAPI:
    """Create and configure FastAPI application."""
    
    app = FastAPI(
        title="DocPlatform API",
        description="AI-Powered Document Generation Platform",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    # Security middleware
    if settings.ENVIRONMENT == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.ALLOWED_HOSTS,
        )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Logging middleware
    app.add_middleware(LoggingMiddleware)
    
    # Include API routes
    app.include_router(api_router, prefix="/api/v1")
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
        }
    
    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "message": "DocPlatform API",
            "version": "1.0.0",
            "docs": "/docs" if settings.DEBUG else "Documentation not available in production",
        }
    
    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions."""
        logger.error(
            "Unhandled exception",
            method=request.method,
            url=str(request.url),
            error=str(exc),
            exc_info=True,
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error" if settings.ENVIRONMENT == "production" else str(exc),
                "type": "internal_server_error",
            },
        )
    
    return app


# Create the FastAPI application instance
app = create_application()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_config=None,  # Use our custom logging
    ) 