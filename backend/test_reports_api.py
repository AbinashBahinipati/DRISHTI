"""
Integration test suite for DRISHTI Multi-Device Cloud Reports REST API.
Tests:
1. POST /api/reports - Creates a report in PostgreSQL/Supabase and verifies citizen reports are NOT automatically Verified.
2. GET /api/reports - Lists reports with filtering and ordering.
3. GET /api/reports/{id} - Fetches single report by ID.
4. PATCH /api/reports/{id} - Mutates verification status and response fields.
5. GET /api/reports/{unknown_id} - Verifies 404 error handling.
6. Teardown - Deletes the test report, leaving zero test/mock data in the database.
"""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app import app
from database import init_db

client = TestClient(app)


def run_reports_api_tests():
    print("=" * 65)
    print(" DRISHTI CLOUD REPORTS REST API TEST SUITE")
    print("=" * 65)

    # Ensure tables exist
    init_db()

    test_report_id = f"test-rep-{uuid.uuid4().hex[:8]}"
    print(f"\n[Setup] Generated temporary test report ID: {test_report_id}")

    test_payload = {
        "id": test_report_id,
        "origin": "citizen",
        "type": "Flash Flood",
        "locationName": "Bhubaneswar Central Bridge",
        "coordinates": {
            "latitude": 20.2961,
            "longitude": 85.8245
        },
        "description": "Rising water levels near bridge pillar #4, 2 families require boat evacuation.",
        "mediaBase64": None,
        "urgency": "High",
        "peopleAffected": "10-20",
        "tags": ["flood", "evacuation", "bridge"],
        "status": "Submitted",
        # Intentionally attempt to submit as "Verified" to test safety guard
        "verificationStatus": "Verified",
        "responseStatus": "Unassigned",
        "assignedResponder": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sourceInfo": {
            "platform": "DRISHTI Web App",
            "authorName": "Citizen Field Observer",
            "verifiedUser": False
        },
        "mlAssessment": {
            "prediction": "informative",
            "informative_probability": 0.892,
            "not_informative_probability": 0.108,
            "status": "completed"
        }
    }

    try:
        # TEST 1: POST /api/reports
        print("\n[Test 1/6] POST /api/reports (Create report & verify citizen unverified guard)...")
        post_res = client.post("/api/reports", json=test_payload)
        if post_res.status_code != 201:
            print(f"[-] FAIL: Expected 201 Created, got {post_res.status_code}: {post_res.text}")
            return False

        created_data = post_res.json()
        if created_data.get("id") != test_report_id:
            print(f"[-] FAIL: Expected ID '{test_report_id}', got '{created_data.get('id')}'")
            return False

        # Verify Citizen Unverified Rule
        if created_data.get("verificationStatus") == "Verified":
            print("[-] FAIL: Citizen report was automatically marked 'Verified'. Must be 'UnderReview'.")
            return False

        print(f"[+] PASS: Report created successfully.")
        print(f"    - ID: {created_data['id']}")
        print(f"    - Verification Status: {created_data['verificationStatus']} (Correctly guarded)")
        print(f"    - Coordinates: {created_data['coordinates']}")
        print(f"    - ML Assessment: {created_data['mlAssessment']['prediction']} ({created_data['mlAssessment']['informative_probability']})")

        # TEST 2: GET /api/reports
        print("\n[Test 2/6] GET /api/reports (Fetch all reports & test filter)...")
        get_all_res = client.get("/api/reports?origin=citizen")
        if get_all_res.status_code != 200:
            print(f"[-] FAIL: Expected 200 OK, got {get_all_res.status_code}: {get_all_res.text}")
            return False

        reports_list = get_all_res.json()
        found = any(r.get("id") == test_report_id for r in reports_list)
        if not found:
            print(f"[-] FAIL: Created report '{test_report_id}' not found in GET /api/reports list.")
            return False

        print(f"[+] PASS: Retrieved {len(reports_list)} report(s). Test report present in list.")

        # TEST 3: GET /api/reports/{id}
        print(f"\n[Test 3/6] GET /api/reports/{test_report_id} (Fetch single report)...")
        get_one_res = client.get(f"/api/reports/{test_report_id}")
        if get_one_res.status_code != 200:
            print(f"[-] FAIL: Expected 200 OK, got {get_one_res.status_code}: {get_one_res.text}")
            return False

        single_report = get_one_res.json()
        if single_report.get("id") != test_report_id or single_report.get("type") != "Flash Flood":
            print(f"[-] FAIL: Data mismatch on single fetch: {single_report}")
            return False

        print(f"[+] PASS: Single report retrieved accurately.")
        print(f"    - Location: {single_report['locationName']}")
        print(f"    - Description: {single_report['description'][:45]}...")

        # TEST 4: PATCH /api/reports/{id} (Organization verification mutation)
        print(f"\n[Test 4/6] PATCH /api/reports/{test_report_id} (Organization verification workflow)...")
        patch_payload = {
            "verificationStatus": "Verified",
            "status": "Verified",
            "responseStatus": "Dispatched",
            "assignedResponder": "ODRF Rapid Response Unit 2",
            "aiAnalysis": {
                "verdict": "Confirmed Genuine",
                "confidenceScore": 94.5,
                "confidenceLevel": "High",
                "reasoning": ["Multi-witness telemetry alignment", "CrisisMMD NLP 89% informative"]
            }
        }
        patch_res = client.patch(f"/api/reports/{test_report_id}", json=patch_payload)
        if patch_res.status_code != 200:
            print(f"[-] FAIL: Expected 200 OK, got {patch_res.status_code}: {patch_res.text}")
            return False

        updated_data = patch_res.json()
        if (
            updated_data.get("verificationStatus") != "Verified"
            or updated_data.get("responseStatus") != "Dispatched"
            or updated_data.get("assignedResponder") != "ODRF Rapid Response Unit 2"
        ):
            print(f"[-] FAIL: PATCH fields did not update correctly: {updated_data}")
            return False

        print(f"[+] PASS: Report workflow updated successfully.")
        print(f"    - Verification Status: {updated_data['verificationStatus']}")
        print(f"    - Response Status: {updated_data['responseStatus']}")
        print(f"    - Assigned Responder: {updated_data['assignedResponder']}")
        print(f"    - AI Analysis Verdict: {updated_data['aiAnalysis']['verdict']}")

        # TEST 5: GET /api/reports/unknown_id (404 Error handling)
        print("\n[Test 5/6] GET /api/reports/non_existent_id (404 Not Found handling)...")
        not_found_res = client.get("/api/reports/non_existent_id_404_test")
        if not_found_res.status_code != 404:
            print(f"[-] FAIL: Expected 404 Not Found, got {not_found_res.status_code}")
            return False

        print(f"[+] PASS: 404 Not Found correctly returned for invalid ID.")

        # TEST 6: DELETE /api/reports/{id} (Teardown & Clean Up)
        print(f"\n[Test 6/6] DELETE /api/reports/{test_report_id} (Automated Cleanup)...")
        del_res = client.delete(f"/api/reports/{test_report_id}")
        if del_res.status_code != 200:
            print(f"[-] FAIL: Expected 200 OK on delete, got {del_res.status_code}: {del_res.text}")
            return False

        # Confirm 404 after deletion
        verify_del_res = client.get(f"/api/reports/{test_report_id}")
        if verify_del_res.status_code != 404:
            print(f"[-] FAIL: Report still exists after deletion!")
            return False

        print(f"[+] PASS: Test report '{test_report_id}' cleaned up. Zero test artifacts left in database.")

        print("\n" + "=" * 65)
        print(" ALL CLOUD REPORT REST API TESTS PASSED (6/6)")
        print("=" * 65)
        return True

    except Exception as e:
        print(f"\n[-] UNEXPECTED ERROR DURING TESTS: {e}")
        # Teardown attempt in case of error
        try:
            client.delete(f"/api/reports/{test_report_id}")
        except Exception:
            pass
        return False


if __name__ == "__main__":
    success = run_reports_api_tests()
    sys.exit(0 if success else 1)
