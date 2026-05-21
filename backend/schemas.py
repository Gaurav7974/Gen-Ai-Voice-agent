"""Models and schemas for request/response validation"""
from pydantic import BaseModel
from typing import Optional

class TextGenerationRequest(BaseModel):
    """Request model for text generation via Groq"""
    prompt: str
    config: Optional[str] = "default"
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None

class TextGenerationResponse(BaseModel):
    """Response model for text generation"""
    text: str
    model: str
    stop_reason: str
    config_used: str

class TTSRequest(BaseModel):
    """Request model for text-to-speech via Sarvam AI"""
    text: str
    config: Optional[str] = "default"
    speaker: Optional[str] = None
    language: Optional[str] = None
    model: Optional[str] = None
    pitch: Optional[float] = None
    pace: Optional[float] = None
    sample_rate: Optional[int] = None
    audio_codec: Optional[str] = None

class TTSResponse(BaseModel):
    """Response model for TTS"""
    audio_url: str
    duration: Optional[float] = None
    format: str = "mp3"
    config_used: str

class VoiceAgentRequest(BaseModel):
    """Combined request for voice agent - text input to audio output"""
    prompt: str
    llm_config: Optional[str] = "default"
    tts_config: Optional[str] = "default"
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    speaker: Optional[str] = None
    language: Optional[str] = None
    use_rag: Optional[bool] = False

class VoiceAgentResponse(BaseModel):
    """Combined response for voice agent"""
    generated_text: str
    audio_url: str
    llm_config_used: str
    tts_config_used: str
    rag_chunks_used: Optional[list] = None

class ConfigsResponse(BaseModel):
    """Response model for available configurations"""
    model_configs: list
    tts_configs: list
