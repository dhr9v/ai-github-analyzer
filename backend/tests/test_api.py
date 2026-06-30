import pytest
from fastapi.testclient import TestClient
from backend.main import app
from unittest.mock import patch

client = TestClient(app)

def test_read_root():
    """
    Test that the root endpoint returns online status.
    """
    response = client.get("/")
    assert response.status_code == 200  # nosec B101
    data = response.json()
    assert data["status"] == "online"  # nosec B101
    assert "version" in data  # nosec B101

@patch("backend.services.orchestrator.AnalysisOrchestrator.run_analysis_stateless")
def test_analyze_repo_mock(mock_run):
    """
    Test the stateless analyze endpoint with a mock.
    """
    mock_run.return_value = {"status": "completed", "overall_score": 95}
    response = client.post(
        "/api/v1/analyze",
        json={
            "url": "https://github.com/dhr9v/ai-github-analyzer",
            "branch": "main",
            "gemini_api_key": "test_key",
            "github_pat": ""
        }
    )
    assert response.status_code == 200  # nosec B101
    assert response.json()["overall_score"] == 95  # nosec B101
