# Gen AI Voice Agent - Full Setup Guide

This is a complete voice agent application with:
- **Backend**: FastAPI with Groq LLM and Sarvam AI TTS
- **Frontend**: React with real-time audio streaming

## Project Structure

```
gen ai voice agent/
├── backend/                     # FastAPI backend
│   ├── main.py                 # App factory
│   ├── config.py               # Configuration management
│   ├── schemas.py              # Data models
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment template
│   ├── .gitignore              # Git ignore rules
│   └── routes/
│       ├── __init__.py         # Utility routes
│       ├── text_generation.py  # Groq LLM routes
│       ├── tts.py              # Sarvam AI TTS routes
│       └── voice_agent.py      # Combined routes + streaming
│
└── frontend/                    # React frontend
    ├── src/
    │   ├── components/
    │   │   ├── VoiceAgent.jsx  # Main component
    │   │   └── VoiceAgent.css  # Styles
    │   ├── services/
    │   │   └── api.js          # API service + dummy data
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    ├── .gitignore
    └── README.md
```

## Quick Start

### Step 1: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
# GROQ_API_KEY=your_groq_key
# SARVAM_API_KEY=your_sarvam_key

# Run the server
uvicorn main:app --reload
```

Backend runs on: `http://localhost:8000`

### Step 2: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run development server
npm run dev
```

Frontend runs on: `http://localhost:3000`

### Access the Application

1. **React UI**: http://localhost:3000
2. **API Docs**: http://localhost:8000/docs
3. **ReDoc**: http://localhost:8000/redoc

## Features

### Frontend
- ✅ Beautiful, responsive UI
- ✅ Real-time audio streaming
- ✅ Temperature and max tokens sliders
- ✅ LLM and TTS configuration selection
- ✅ Generated text display
- ✅ Audio playback controls
- ✅ Dummy data for testing (no API keys needed)
- ✅ Error handling and loading states

### Backend
- ✅ Modular route structure
- ✅ Configuration presets for LLM and TTS
- ✅ Environment-based settings
- ✅ Groq LLM integration
- ✅ Sarvam AI TTS integration
- ✅ Streaming audio responses
- ✅ Comprehensive error handling
- ✅ Full API documentation with Swagger UI

## API Endpoints

### Text Generation
- **POST** `/api/generate-text` - Generate text via Groq

### Text-to-Speech
- **POST** `/api/synthesize-speech` - TTS via Sarvam AI

### Voice Agent (Combined)
- **POST** `/api/voice-agent` - Generate text + get audio URL
- **POST** `/api/voice-agent-combined` - Same as above
- **POST** `/api/voice-agent-stream` - Generate text + stream audio directly

### Utility
- **GET** `/api/configs` - Get available configurations
- **GET** `/health` - Health check

## Testing with Dummy Data

To test without API keys:

### Backend
```bash
# Still need to run, but routes won't be called
uvicorn main:app --reload
```

### Frontend
```bash
# Set environment variable
REACT_APP_USE_DUMMY=true npm run dev

# Or update .env
echo "REACT_APP_USE_DUMMY=true" >> .env
npm run dev
```

This will:
- Generate random dummy text responses
- Create synthetic audio for testing
- Not require any API keys

## Configuration

### LLM Presets (config.py)
- **default** - Balanced (temperature: 0.7, tokens: 1024)
- **creative** - Creative (temperature: 0.9, tokens: 2048)
- **precise** - Factual (temperature: 0.3, tokens: 1024)
- **fast** - Fast model (temperature: 0.7, tokens: 512)
- **detailed** - Large model (temperature: 0.5, tokens: 4096)

### TTS Presets (config.py)
- **default** - Standard female voice
- **calm** - Slower, lower pitch
- **energetic** - Faster, higher pitch
- **professional** - Male, formal
- **friendly** - Female, warm

### Add Custom Configs
Edit `backend/config.py`:

```python
MODEL_CONFIGS = {
    "my_config": {
        "model": "mixtral-8x7b-32768",
        "temperature": 0.5,
        "max_tokens": 2000,
        "top_p": 0.95,
    }
}

TTS_CONFIGS = {
    "my_voice": {
        "speaker": "male",
        "language": "en-US",
        "pitch": 1.1,
        "pace": 0.95,
    }
}
```

## Environment Variables

### Backend (.env)
```env
# Required
GROQ_API_KEY=your_key
SARVAM_API_KEY=your_key

# Optional (shown with defaults)
HOST=0.0.0.0
PORT=8000
ENV=development
LLM_MODEL=mixtral-8x7b-32768
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1024
TTS_SPEAKER=female
TTS_LANGUAGE=en-US
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_USE_DUMMY=false
```

## Getting API Keys

### Groq
1. Go to https://console.groq.com
2. Sign up / Log in
3. Create an API key
4. Copy and paste into `.env`

### Sarvam AI
1. Go to https://sarvam.ai
2. Sign up / Log in
3. Create an API key
4. Copy and paste into `.env`

## Building for Production

### Backend
```bash
# Backend doesn't need building, just run:
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run build
# Output in dist/ folder
```

## Troubleshooting

**Q: CORS error?**
- Ensure backend is running
- Check `REACT_APP_API_URL` matches backend URL

**Q: API key invalid?**
- Verify keys in backend `.env`
- Restart backend after updating

**Q: Audio won't play?**
- Check browser console for errors
- Ensure API keys are valid
- Try dummy data mode first

**Q: Can't connect to backend?**
- Ensure backend is running on port 8000
- Check firewall settings
- Verify `REACT_APP_API_URL` is correct

## Next Steps

1. ✅ Setup both frontend and backend
2. ✅ Add API keys to backend `.env`
3. ✅ Test with dummy data (optional)
4. ✅ Run backend: `uvicorn main:app --reload`
5. ✅ Run frontend: `npm run dev`
6. ✅ Visit http://localhost:3000
7. ✅ Generate and listen to voice responses!

## Support

For issues or questions, check:
- Backend README: `backend/README.md`
- Frontend README: `frontend/README.md`
- API Docs: http://localhost:8000/docs
