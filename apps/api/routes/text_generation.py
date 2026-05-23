"""Text generation routes using Groq LLM"""
from fastapi import APIRouter, HTTPException
from groq import Groq
from config import settings, get_model_config
from schemas import TextGenerationRequest, TextGenerationResponse

router = APIRouter(prefix="/api", tags=["Text Generation"])

# Initialize Groq client when configured.
groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

@router.post("/generate-text", response_model=TextGenerationResponse)
async def generate_text(request: TextGenerationRequest):
    """
    Generate text using Groq LLM
    
    Args:
        request: TextGenerationRequest with prompt and configuration
    
    Returns:
        TextGenerationResponse with generated text
    """
    try:
        if groq_client is None:
            raise HTTPException(status_code=500, detail="Groq API key not configured")

        # Get base config
        config = get_model_config(request.config)
        config_used = request.config
        
        # Apply overrides if provided
        model = request.model or config["model"]
        temperature = request.temperature if request.temperature is not None else config["temperature"]
        max_tokens = request.max_tokens or config["max_tokens"]
        top_p = request.top_p if request.top_p is not None else config["top_p"]
        
        completion = groq_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": request.prompt,
                }
            ],
            temperature=temperature,
            max_completion_tokens=max_tokens,
            top_p=top_p,
        )
        
        choice = completion.choices[0]
        generated_text = choice.message.content or ""
        
        return TextGenerationResponse(
            text=generated_text,
            model=model,
            stop_reason=choice.finish_reason or "stop",
            config_used=config_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating text: {str(e)}")
