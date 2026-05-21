import pytest
from pathlib import Path
from document_loader import chunk_text, build_chunk_id, load_chunks, discover_documents
from rag_config import CHUNK_SIZE, CHUNK_OVERLAP, SUPPORTED_EXTENSIONS

def test_chunk_text_empty():
    assert chunk_text("") == []
    assert chunk_text("   \n   ") == []

def test_chunk_text_single_short():
    text = "Short text"
    chunks = chunk_text(text, chunk_size=100, overlap=10)
    assert chunks == ["Short text"]

def test_chunk_text_long_with_overlap():
    # Length is 100 characters
    text = "A" * 100
    chunks = chunk_text(text, chunk_size=60, overlap=20)
    
    assert len(chunks) == 2
    assert chunks[0] == "A" * 60
    assert chunks[1] == "A" * 60
    
    # Chunk overlap correctness: verify last CHUNK_OVERLAP characters of chunk N == first CHUNK_OVERLAP of chunk N+1.
    assert chunks[0][-20:] == chunks[1][:20]
    
    # With distinct characters to verify overlap more rigorously
    text2 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+-=[]{}|;:,.<>?"
    # length of text2 = 26+26+10+21 = 83
    chunks2 = chunk_text(text2, chunk_size=40, overlap=10)
    # chunk 1: text2[0:40] -> length 40
    # next start: 40 - 10 = 30
    # chunk 2: text2[30:70] -> length 40
    # next start: 70 - 10 = 60
    # chunk 3: text2[60:83] -> length 23
    assert len(chunks2) == 3
    assert chunks2[0][-10:] == chunks2[1][:10]
    assert chunks2[1][-10:] == chunks2[2][:10]

def test_chunk_text_exact_size():
    text = "A" * CHUNK_SIZE
    chunks = chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
    assert len(chunks) == 1
    assert chunks[0] == text

def test_chunk_text_size_plus_one():
    text = "A" * (CHUNK_SIZE + 1)
    chunks = chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
    assert len(chunks) == 2
    assert chunks[0] == text[:CHUNK_SIZE]
    assert chunks[1] == text[CHUNK_SIZE - CHUNK_OVERLAP:]
    assert chunks[0][-CHUNK_OVERLAP:] == chunks[1][:CHUNK_OVERLAP]

def test_build_chunk_id():
    id1 = build_chunk_id("file.txt", 0, "chunk text")
    id2 = build_chunk_id("file.txt", 0, "chunk text")
    id3 = build_chunk_id("file.txt", 1, "chunk text")
    
    assert id1 == id2
    assert id1 != id3
    assert id1.startswith("file.txt:0:")
    assert len(id1.split(":")[2]) == 16  # digest length

def test_load_chunks(tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    
    file1 = data_dir / "test1.txt"
    file1.write_text("A" * (CHUNK_SIZE + 1), encoding="utf-8")
    
    file2 = data_dir / "test2.md"
    file2.write_text("Hello World", encoding="utf-8")
    
    chunks = load_chunks(data_dir)
    
    assert len(chunks) == 3  # 2 chunks from test1.txt, 1 chunk from test2.md
    
    # Sort chunks by source and index to assert deterministically
    chunks.sort(key=lambda c: (c.metadata["source"], c.metadata["chunk_index"]))
    
    assert chunks[0].metadata["source"] == "test1.txt"
    assert chunks[0].metadata["chunk_index"] == 0
    assert chunks[0].text == "A" * CHUNK_SIZE
    
    assert chunks[1].metadata["source"] == "test1.txt"
    assert chunks[1].metadata["chunk_index"] == 1
    assert chunks[1].text == "A" * (CHUNK_OVERLAP + 1) # last chunk of size overlap + 1
    
    assert chunks[2].metadata["source"] == "test2.md"
    assert chunks[2].metadata["chunk_index"] == 0
    assert chunks[2].text == "Hello World"
    assert chunks[2].metadata["extension"] == ".md"

def test_discover_documents_empty(tmp_path):
    assert discover_documents(tmp_path) == []
