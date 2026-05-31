from fastapi.testclient import TestClient
# Import using absolute path from backend root
try:
    from main import app
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()

def test_cors_check():
    response = client.get("/api/cors-check")
    assert response.status_code == 200
    assert "allowed" in response.json()
