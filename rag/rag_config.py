"""Configuration for the local ChromaDB RAG template."""
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_store"

COLLECTION_NAME = "voice_agent_knowledge"
SUPPORTED_EXTENSIONS = {".txt", ".md", ".markdown"}

# Keep chunks small enough to be useful in a voice-agent prompt.
CHUNK_SIZE = 900
CHUNK_OVERLAP = 120
DEFAULT_N_RESULTS = 4

