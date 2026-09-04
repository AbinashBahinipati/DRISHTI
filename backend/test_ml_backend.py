import json
from fastapi.testclient import TestClient
from app import app, ml_manager


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "DRISHTI ML Backend"
        assert data["model_loaded"] is True
        # Verify internal file paths are not exposed
        serialized = json.dumps(data)
        assert "C:" not in serialized
        assert "/" not in data.get("model_info", {}).get("model_name", "")
        assert "\\" not in serialized
        print("\n[TEST PASS] /health response:", data)


def test_analyze_report_informative():
    with TestClient(app) as client:
        payload = {
            "text": "Severe flash flooding along River Ganga near Rishikesh. Multiple roads submerged and rescue operations underway by NDRF."
        }
        response = client.post("/api/ml/analyze-report", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "prediction" in data
        assert data["prediction"] in ["informative", "not_informative"]
        assert "informative_probability" in data
        assert "not_informative_probability" in data

        inf_p = data["informative_probability"]
        not_inf_p = data["not_informative_probability"]

        assert 0.0 <= inf_p <= 1.0
        assert 0.0 <= not_inf_p <= 1.0
        assert abs(inf_p + not_inf_p - 1.0) < 1e-4

        # For a clear disaster incident report, expect informative
        assert data["prediction"] == "informative"
        assert inf_p > 0.5
        print("\n[TEST PASS] Informative report test passed:", data)


def test_analyze_report_non_informative():
    with TestClient(app) as client:
        payload = {
            "text": "good morning have a great weekend everyone"
        }
        response = client.post("/api/ml/analyze-report", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "prediction" in data
        assert "informative_probability" in data
        assert "not_informative_probability" in data
        print("\n[TEST PASS] Casual text test passed:", data)


def test_analyze_report_empty_text():
    with TestClient(app) as client:
        # Test empty string
        response1 = client.post("/api/ml/analyze-report", json={"text": ""})
        assert response1.status_code == 400
        assert "cannot be empty" in response1.json()["detail"]

        # Test whitespace only
        response2 = client.post("/api/ml/analyze-report", json={"text": "   "})
        assert response2.status_code == 400
        assert "cannot be empty" in response2.json()["detail"]
        print("\n[TEST PASS] Empty text validation (HTTP 400) passed.")


def test_missing_body():
    with TestClient(app) as client:
        response = client.post("/api/ml/analyze-report", json={})
        assert response.status_code == 422
        print("\n[TEST PASS] Missing body validation (HTTP 422) passed.")


if __name__ == "__main__":
    print("Running DRISHTI ML Backend Tests...")
    test_health_endpoint()
    test_analyze_report_informative()
    test_analyze_report_non_informative()
    test_analyze_report_empty_text()
    test_missing_body()
    print("\nALL BACKEND UNIT TESTS PASSED SUCCESSFULLY!")
