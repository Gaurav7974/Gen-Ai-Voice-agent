from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import text_generation, tts, voice_agent, stt
from routes.__init__ import router as utils_router

def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    app = FastAPI(
        title="Voice Agent API",
        description="Backend API for the Gen AI Voice Agent with Groq LLM and Sarvam AI TTS",
        version="1.0.0"
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(utils_router)
    app.include_router(stt.router)
    app.include_router(text_generation.router)
    app.include_router(tts.router)
    app.include_router(voice_agent.router)
    
    return app

# Create app instance
app = create_app()
