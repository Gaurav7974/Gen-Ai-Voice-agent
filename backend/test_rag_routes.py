import pytest
from fastapi.testclient import TestClient
import shutil
import os
from pathlib import Path
from main import app  # Assuming main.py is in backend
from routes.rag import RAG_DATA_DIR, RAG_DIR, _run_rag_script

# Make sure RAG_DATA_DIR exists for tests, but we'll use a fixture to clean up
@pytest.fixture
def clean_rag_env():
    # Before test: clean data dir and chroma dir
    if RAG_DATA_DIR.exists():
        shutil.rmtree(RAG_DATA_DIR)
    
    chroma_store = RAG_DIR / "chroma_store"
    if chroma_store.exists():
        shutil.rmtree(chroma_store)
        
    RAG_DATA_DIR.mkdir(parents=True, exist_ok=True)
    yield
    # After test: clean up
    if RAG_DATA_DIR.exists():
        shutil.rmtree(RAG_DATA_DIR)
    if chroma_store.exists():
        shutil.rmtree(chroma_store)

client = TestClient(app)

def test_upload_rag_file_valid(clean_rag_env):
    file_content = b"This is a test document about Python programming."
    response = client.post(
        "/api/rag/upload",
        files={"file": ("test_doc.txt", file_content, "text/plain")}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Uploaded 'test_doc.txt' (49 bytes)"
    
    # Verify file is stored
    assert (RAG_DATA_DIR / "test_doc.txt").exists()
    assert (RAG_DATA_DIR / "test_doc.txt").read_bytes() == file_content

def test_upload_rag_file_invalid_extension(clean_rag_env):
    file_content = b"Some data"
    response = client.post(
        "/api/rag/upload",
        files={"file": ("test.jpg", file_content, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]
    assert not (RAG_DATA_DIR / "test.jpg").exists()

def test_upload_missing_file(clean_rag_env):
    # Testing missing file (this should be caught by FastAPI validation)
    response = client.post("/api/rag/upload")
    assert response.status_code == 422 # Unprocessable Entity

def test_delete_rag_file(clean_rag_env):
    # First create a file
    file_path = RAG_DATA_DIR / "to_delete.txt"
    file_path.write_text("Delete me")
    
    response = client.delete("/api/rag/files/to_delete.txt")
    assert response.status_code == 200
    assert response.json()["message"] == "Deleted 'to_delete.txt'"
    assert not file_path.exists()

def test_delete_path_traversal(clean_rag_env):
    response = client.delete("/api/rag/files/%2E%2E/config.py")
    assert response.status_code == 400, response.text
    assert "Invalid file path" in response.json()["detail"]

def test_ingest_and_query_flow(clean_rag_env):
    # 1. Upload a file
    doc_content = "The secret password is 'OpenSesame123'. Keep it safe."
    client.post(
        "/api/rag/upload",
        files={"file": ("secret.txt", doc_content.encode('utf-8'), "text/plain")}
    )
    
    # 2. Ingest
    ingest_response = client.post("/api/rag/ingest")
    assert ingest_response.status_code == 200, ingest_response.text
    assert ingest_response.json()["chunks"] > 0
    
    # 3. Query
    query_response = client.post("/api/rag/query?question=What is the secret password?")
    assert query_response.status_code == 200
    results = query_response.json()["results"]
    assert len(results) > 0
    
    # Verify exact chunk content is found
    best_match = results[0]
    assert best_match["source"] == "secret.txt"
    assert "OpenSesame123" in best_match["text"]
    
    # 4. Delete the file and ingest again
    client.delete("/api/rag/files/secret.txt")
    client.post("/api/rag/ingest")
    
    # 5. Query again should return empty or unrelated
    query_response_2 = client.post("/api/rag/query?question=What is the secret password?")
    assert query_response_2.status_code == 200
    results_2 = query_response_2.json()["results"]
    if results_2:
        # Depending on how the ingestion handles deletions (if it deletes from Chroma)
        # Actually chroma upserts, does it delete? The ingest.py logic might just upsert.
        # But if the test logic expects query not to return it, let's just log or check.
        # For this test we will just assume standard behavior. The prompt says:
        # "file removed, query no longer returns from that file."
        # If ingest.py syncs deletions, this will pass. If not, it will fail and we must fix ingest.py.
        assert not any(r["source"] == "secret.txt" for r in results_2)

def test_query_special_characters(clean_rag_env):
    # Unicode and punctuation in query
    query_response = client.post("/api/rag/query?question=Qué pasaría con über #%&*?!")
    assert query_response.status_code == 200, query_response.text
    # Should handle gracefully, returning results list (empty if no docs)
    assert isinstance(query_response.json()["results"], list)

from unittest.mock import patch

def test_voice_agent_with_rag_integration(clean_rag_env):
    # 1. Upload and ingest some unique RAG context
    doc_content = "The planet Zog has exactly 42 moons."
    client.post(
        "/api/rag/upload",
        files={"file": ("zog.txt", doc_content.encode('utf-8'), "text/plain")}
    )
    client.post("/api/rag/ingest")

    # Mock the external LLM and TTS calls so we don't need real API keys in tests
    # But we want to test our logic of injecting RAG
    with patch("routes.voice_agent.groq_client") as mock_groq, \
         patch("routes.voice_agent.httpx.AsyncClient") as mock_httpx:
             
        # Setup mock Groq response
        mock_msg = mock_groq.messages.create.return_value
        mock_msg.content = [type("obj", (object,), {"text": "I see you asked about Zog."})]
        
        # Setup mock Sarvam response
        mock_client_instance = mock_httpx.return_value.__aenter__.return_value
        
        mock_post_resp = type("obj", (object,), {
            "raise_for_status": lambda: None,
            "json": lambda: {"audios": [{"audio_url": "http://fake-audio-url"}]}
        })
        mock_client_instance.post.return_value = mock_post_resp

        # Test POST with use_rag=True
        req_with_rag = {
            "prompt": "How many moons does Zog have?",
            "use_rag": True
        }
        resp1 = client.post("/api/voice-agent-with-rag", json=req_with_rag)
        assert resp1.status_code == 200, resp1.text
        data1 = resp1.json()
        assert data1["rag_chunks_used"] is not None
        assert any("Zog" in chunk for chunk in data1["rag_chunks_used"])
        
        # Test POST with use_rag=False
        req_without_rag = {
            "prompt": "How many moons does Zog have?",
            "use_rag": False
        }
        resp2 = client.post("/api/voice-agent-with-rag", json=req_without_rag)
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["rag_chunks_used"] == []

def test_voice_agent_rag_fallback(clean_rag_env):
    with patch("routes.voice_agent.groq_client") as mock_groq, \
         patch("routes.voice_agent.httpx.AsyncClient") as mock_httpx:
             
        mock_msg = mock_groq.messages.create.return_value
        mock_msg.content = [type("obj", (object,), {"text": "Fallback text"})]
        
        mock_client_instance = mock_httpx.return_value.__aenter__.return_value
        mock_post_resp = type("obj", (object,), {
            "raise_for_status": lambda: None,
            "json": lambda: {"audios": [{"audio_url": "http://fake-audio-url"}]}
        })
        mock_client_instance.post.return_value = mock_post_resp

        # Force a RAG failure by renaming query.py temporarily
        query_script = RAG_DIR / "query.py"
        backup_path = RAG_DIR / "query.py.bak"
        query_script.rename(backup_path)

        try:
            req = {"prompt": "Hello", "use_rag": True}
            resp = client.post("/api/voice-agent-with-rag", json=req)
            
            assert resp.status_code == 200
            assert resp.json()["rag_chunks_used"] == []
        finally:
            backup_path.rename(query_script)


