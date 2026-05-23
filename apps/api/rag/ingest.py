"""Ingest local files into a persistent ChromaDB collection (legacy CLI entry point).

Imports from services for actual logic.
"""
import sys
from pathlib import Path

# Allow running as a script from apps/api/rag/
api_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(api_dir))
sys.path.insert(0, str(api_dir / "services"))

from services.rag import rag_ingest


if __name__ == "__main__":
    rag_ingest()
