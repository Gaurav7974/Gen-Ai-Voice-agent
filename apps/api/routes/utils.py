"""Utility routes - configs and health checks"""
from fastapi import APIRouter
from config import settings, get_available_model_configs, get_available_tts_configs
from schemas import ConfigsResponse

router = APIRouter(tags=["Utility"])

@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Voice Agent API",
        "docs": "/docs",
        "health": "/health",
        "configs": "/api/configs"
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "environment": settings.ENV}

@router.get("/api/configs", response_model=ConfigsResponse)
async def get_configs():
    """Get available model and TTS configurations"""
    return ConfigsResponse(
        model_configs=get_available_model_configs(),
        tts_configs=get_available_tts_configs()
    )
