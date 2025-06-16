from fastapi import APIRouter
from .ai import router as ai_router
from .templates import router as templates_router

api_router = APIRouter()
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])
api_router.include_router(templates_router, tags=["templates"]) 