"""
API routes module
"""

from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.document import router as document_router
from app.api.routes.salesforce import router as salesforce_router
from app.api.routes.templates import router as templates_router
from app.api.v1.ai import router as ai_router

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(document_router, prefix="/documents", tags=["documents"])
api_router.include_router(salesforce_router, prefix="/salesforce", tags=["salesforce"])
api_router.include_router(templates_router, prefix="/templates", tags=["templates"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "service": "DocPlatform API",
        "version": "1.0.0"
    }

"""API route definitions.""" 