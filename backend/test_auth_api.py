"""
Test suite for DRISHTI Organization Server-Side Authentication API.
Tests:
1. Valid organization credentials -> 200 OK with bearer token.
2. Wrong password -> 401 Unauthorized.
3. Missing fields -> 400 Bad Request.
4. Token verification -> 200 OK.
5. Invalid/tampered token -> 401 Unauthorized.
6. Zero password/credential exposure in responses.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app import app
from auth_api import ORGANIZATION_LOGIN_ID, ORGANIZATION_PASSWORD

client = TestClient(app)


def run_auth_api_tests():
    print("=" * 65)
    print(" DRISHTI ORGANIZATION AUTHENTICATION TEST SUITE")
    print("=" * 65)

    # TEST 1: Valid Login
    print("\n[Test 1/5] Testing valid organization operator login...")
    login_payload = {
        "loginId": ORGANIZATION_LOGIN_ID,
        "password": ORGANIZATION_PASSWORD
    }
    res = client.post("/api/auth/organization/login", json=login_payload)
    if res.status_code != 200:
        print(f"[-] FAIL: Expected 200 OK, got {res.status_code}: {res.text}")
        return False

    data = res.json()
    if not data.get("success") or not data.get("token"):
        print(f"[-] FAIL: Expected success and token in response, got: {data}")
        return False

    token = data["token"]
    print(f"[+] PASS: Organization login succeeded.")
    print(f"    - Role: {data['organization']['role']}")
    print(f"    - Token issued: {token[:25]}... (HMAC Signed)")

    # Ensure password is not returned
    if "password" in str(data).lower():
        print("[-] FAIL: Password field detected in response body!")
        return False

    # TEST 2: Wrong Password
    print("\n[Test 2/5] Testing wrong organization password (401 Unauthorized)...")
    bad_payload = {
        "loginId": ORGANIZATION_LOGIN_ID,
        "password": "WrongPasswordAttempt@999"
    }
    res_bad = client.post("/api/auth/organization/login", json=bad_payload)
    if res_bad.status_code != 401:
        print(f"[-] FAIL: Expected 401 Unauthorized, got {res_bad.status_code}")
        return False

    print(f"[+] PASS: Wrong password rejected with 401 Unauthorized.")

    # TEST 3: Missing Fields
    print("\n[Test 3/5] Testing missing credentials (400 Bad Request)...")
    empty_payload = {
        "loginId": "",
        "password": ""
    }
    res_empty = client.post("/api/auth/organization/login", json=empty_payload)
    if res_empty.status_code != 400:
        print(f"[-] FAIL: Expected 400 Bad Request, got {res_empty.status_code}")
        return False

    print(f"[+] PASS: Empty credentials rejected with 400 Bad Request.")

    # TEST 4: Verify Valid Token
    print("\n[Test 4/5] Testing token verification (GET /api/auth/organization/verify)...")
    res_verify = client.get(
        "/api/auth/organization/verify",
        headers={"Authorization": f"Bearer {token}"}
    )
    if res_verify.status_code != 200:
        print(f"[-] FAIL: Expected 200 OK, got {res_verify.status_code}")
        return False

    verify_data = res_verify.json()
    if not verify_data.get("valid"):
        print(f"[-] FAIL: Expected valid: true, got: {verify_data}")
        return False

    print(f"[+] PASS: Session token validated successfully.")

    # TEST 5: Tampered Token
    print("\n[Test 5/5] Testing tampered session token rejection (401 Unauthorized)...")
    tampered_token = token[:-5] + "XXXXX"
    res_tampered = client.get(
        "/api/auth/organization/verify",
        headers={"Authorization": f"Bearer {tampered_token}"}
    )
    if res_tampered.status_code != 401:
        print(f"[-] FAIL: Expected 401 for tampered token, got {res_tampered.status_code}")
        return False

    print(f"[+] PASS: Tampered token rejected with 401 Unauthorized.")

    print("\n" + "=" * 65)
    print(" ALL ORGANIZATION AUTHENTICATION TESTS PASSED (5/5)")
    print("=" * 65)
    return True


if __name__ == "__main__":
    success = run_auth_api_tests()
    sys.exit(0 if success else 1)
