"""Load and chunk local text documents for Chroma ingestion."""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path

from services.rag_config import CHUNK_OVERLAP, CHUNK_SIZE, SUPPORTED_EXTENSIONS


@dataclass(frozen=True)
class DocumentChunk:
    chunk_id: str
    text: str
    metadata: dict


# check operations
def discover_documents(data_dir: Path) -> list[Path]:
    """Return supported data files in deterministic order."""
    if not data_dir.exists():
        return []

    return sorted(
        path
        for path in data_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


# read / write


def read_text_file(path: Path) -> str:
    """Read a text file with a forgiving UTF-8 strategy."""
    return path.read_text(encoding="utf-8", errors="replace")


def chunk_text(
    text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP
) -> list[str]:
    """Split text into overlapping character chunks."""
    cleaned = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not cleaned:
        return []

    chunks: list[str] = []
    start = 0
    text_length = len(cleaned)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == text_length:
            break
        start = max(end - overlap, start + 1)

    return chunks


def build_chunk_id(relative_path: str, chunk_index: int, chunk: str) -> str:
    """Build a stable ID so repeated ingestion updates the same chunk."""
    digest = sha256(
        f"{relative_path}:{chunk_index}:{chunk}".encode("utf-8")
    ).hexdigest()
    return f"{relative_path}:{chunk_index}:{digest[:16]}"


def load_chunks(data_dir: Path) -> list[DocumentChunk]:
    """Load all supported documents and return chunks with Chroma metadata."""
    chunks: list[DocumentChunk] = []

    for path in discover_documents(data_dir):
        relative_path = path.relative_to(data_dir).as_posix()
        file_text = read_text_file(path)
        file_chunks = chunk_text(file_text)

        for index, chunk in enumerate(file_chunks):
            chunks.append(
                DocumentChunk(
                    chunk_id=build_chunk_id(relative_path, index, chunk),
                    text=chunk,
                    metadata={
                        "source": relative_path,
                        "chunk_index": index,
                        "file_name": path.name,
                        "extension": path.suffix.lower(),
                    },
                )
            )

    return chunks
