"""RAG knowledge base management routes - file upload, list, delete, ingest, query."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/rag", tags=["RAG Knowledge Base"])

# Resolve rag/ directory relative to the project root (apps/api/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAG_DIR = PROJECT_ROOT / "rag"
RAG_DATA_DIR = RAG_DIR / "data"
SUPPORTED_EXTENSIONS = {".txt", ".md", ".markdown"}


class FileInfo(BaseModel):
    name: str
    size: int


class FileListResponse(BaseModel):
    files: list[FileInfo]


class MessageResponse(BaseModel):
    message: str


class IngestResponse(BaseModel):
    message: str
    chunks: int


class QueryResult(BaseModel):
    source: str
    chunk_index: int
    distance: float
    text: str


class QueryResponse(BaseModel):
    results: list[QueryResult]


def _ensure_data_dir() -> None:
    RAG_DATA_DIR.mkdir(parents=True, exist_ok=True)


def _run_rag_script(script: str, *args: str) -> subprocess.CompletedProcess:
    """Run a RAG script with the backend venv's Python."""
    python_exe = sys.executable
    script_path = RAG_DIR / script
    if not script_path.exists():
        raise RuntimeError(f"RAG script not found: {script_path}")
    return subprocess.run(
        [python_exe, str(script_path), *args],
        capture_output=True,
        text=True,
        cwd=str(RAG_DIR),
        timeout=120,
    )


@router.get("/files", response_model=FileListResponse)
async def list_rag_files():
    """List all knowledge files in rag/data/."""
    _ensure_data_dir()
    files = []
    for path in sorted(RAG_DATA_DIR.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(FileInfo(name=path.relative_to(RAG_DATA_DIR).as_posix(), size=path.stat().st_size))
    return FileListResponse(files=files)


@router.post("/upload", response_model=MessageResponse)
async def upload_rag_file(file: UploadFile = File(...)):
    """Upload a knowledge file (.txt, .md, .markdown) to rag/data/."""
    _ensure_data_dir()

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    dest = RAG_DATA_DIR / file.filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    dest.write_bytes(content)

    return MessageResponse(message=f"Uploaded '{file.filename}' ({len(content)} bytes)")


@router.delete("/files/{filename:path}", response_model=MessageResponse)
async def delete_rag_file(filename: str):
    """Delete a knowledge file from rag/data/."""
    target = RAG_DATA_DIR / filename
    # Prevent directory traversal attacks
    if not target.resolve().is_relative_to(RAG_DATA_DIR.resolve()):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    target.unlink()
    return MessageResponse(message=f"Deleted '{filename}'")


@router.post("/ingest", response_model=IngestResponse)
async def ingest_rag():
    """Run the RAG ingestion pipeline (chunk + embed + upsert to ChromaDB)."""
    try:
        result = _run_rag_script("ingest.py")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Ingestion timed out (120s)")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {result.stderr.strip()}")

    # Parse chunk count from stdout: "Ingested N chunks into collection ..."
    output = result.stdout.strip()
    chunks = 0
    for line in output.splitlines():
        if line.startswith("Ingested"):
            parts = line.split()
            if len(parts) >= 2:
                try:
                    chunks = int(parts[1])
                except ValueError:
                    pass
            break

    return IngestResponse(message=output, chunks=chunks)


@router.post("/query", response_model=QueryResponse)
async def query_rag(question: str, n_results: Optional[int] = 4):
    """Query the RAG knowledge base."""
    try:
        result = _run_rag_script("query.py", question, "--n-results", str(n_results))
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Query timed out (120s)")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Query failed: {result.stderr.strip()}")

    # Parse the query output to extract structured results
    # The query.py output looks like:
    # Result 1
    # Source: file.md | chunk: 0 | distance: 0.5
    # <text content>
    results = []
    lines = result.stdout.strip().splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("Result "):
            # Next line: Source: ... | chunk: ... | distance: ...
            if i + 1 < len(lines):
                meta_line = lines[i + 1].strip()
                # Parse metadata
                source = "unknown"
                chunk_index = 0
                distance = 0.0
                for part in meta_line.split("|"):
                    part = part.strip()
                    if part.startswith("Source:"):
                        source = part.replace("Source:", "").strip()
                    elif part.startswith("chunk:"):
                        try:
                            chunk_index = int(part.replace("chunk:", "").strip())
                        except ValueError:
                            pass
                    elif part.startswith("distance:"):
                        try:
                            distance = float(part.replace("distance:", "").strip())
                        except ValueError:
                            pass
                # Next line(s): text content
                text_lines = []
                i += 2
                while i < len(lines) and not lines[i].strip().startswith("Result "):
                    text_lines.append(lines[i].strip())
                    i += 1
                text = "\n".join(text_lines).strip()
                results.append(QueryResult(source=source, chunk_index=chunk_index, distance=distance, text=text))
            else:
                i += 1
        else:
            i += 1

    return QueryResponse(results=results)
