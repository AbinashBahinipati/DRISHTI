import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("drishti_auth_api")

# Explicitly load backend/.env if present
ENV_FILE = Path(__file__).resolve().parent / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()

router = APIRouter(prefix="/api/auth/organization", tags=["Organization Authentication"])

# Token lifetime: 24 hours
TOKEN_LIFETIME_SECONDS = 24 * 60 * 60


def clean_env_str(val: Optional[str]) -> str:
    """Cleans environment string by stripping quotes and whitespace."""
    if not val:
        return ""
    s = val.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    return s


def get_org_credentials() -> tuple[str, str, str]:
    """Dynamically reads organization credentials from server environment."""
    # Ensure fresh read from .env if updated
    if ENV_FILE.exists():
        load_dotenv(ENV_FILE, override=False)

    org_id = clean_env_str(os.getenv("ORGANIZATION_LOGIN_ID")) or "drishti_admin"
    org_pass = clean_env_str(os.getenv("ORGANIZATION_PASSWORD")) or "DrishtiAdminSecure@2026"
    auth_secret = clean_env_str(os.getenv("AUTH_SECRET_KEY")) or "drishti-secret-key-prod-auth-2026"
    return org_id, org_pass, auth_secret


# Module-level defaults / exports for testing compatibility
ORGANIZATION_LOGIN_ID, ORGANIZATION_PASSWORD, AUTH_SECRET_KEY = get_org_credentials()


class OrgLoginRequest(BaseModel):
    loginId: str = Field(..., description="Authorized organization login ID")
    password: str = Field(..., description="Authorized organization password")


class OrgInfo(BaseModel):
    id: str = "DRISHTI-HQ-01"
    name: str = "DRISHTI Disaster Response Command Center"
    role: str = "organization"
    level: str = "AUTHORIZED_COMMAND_OPERATOR"


class OrgLoginResponse(BaseModel):
    success: bool = True
    token: str
    expiresIn: int
    organization: OrgInfo


def create_signed_token(login_id: str) -> str:
    """Generates an HMAC-SHA256 signed session token."""
    _, _, auth_secret = get_org_credentials()
    now = int(time.time())
    payload = {
        "sub": login_id,
        "role": "organization",
        "iat": now,
        "exp": now + TOKEN_LIFETIME_SECONDS,
        "nonce": secrets.token_hex(8)
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode('utf-8')).decode('utf-8').rstrip('=')
    
    signature = hmac.new(
        auth_secret.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{payload_b64}.{signature}"


def verify_signed_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies HMAC signature and expiration of session token."""
    if not token or "." not in token:
        return None
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        
        _, _, auth_secret = get_org_credentials()

        # Verify HMAC signature
        expected_sig = hmac.new(
            auth_secret.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not secrets.compare_digest(signature, expected_sig):
            return None
        
        # Pad base64 if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding
            
        payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8')
        payload = json.loads(payload_json)
        
        now = int(time.time())
        if payload.get("exp", 0) < now:
            return None
            
        if payload.get("role") != "organization":
            return None
            
        return payload
    except Exception as e:
        logger.warning(f"Token verification error: {e}")
        return None


@router.post(
    "/login",
    response_model=OrgLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Organization Operator Login",
)
def organization_login(payload: OrgLoginRequest):
    """
    Authenticates authorized organization personnel against server-side environment credentials.
    - Strictly rejects public/unauthorized accounts.
    - Never returns or leaks credentials.
    - Returns a signed bearer token.
    """
    clean_id = payload.loginId.strip()
    clean_pass = payload.password.strip()

    if not clean_id or not clean_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Login ID and Password are required.",
        )

    expected_id, expected_pass, _ = get_org_credentials()

    # Constant-time comparison to prevent timing attacks
    id_valid = secrets.compare_digest(clean_id, expected_id)
    pass_valid = secrets.compare_digest(clean_pass, expected_pass)

    if not (id_valid and pass_valid):
        logger.warning(f"Failed organization login attempt for ID: '{clean_id}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid organization credentials. Please contact the DRISHTI Administrator.",
        )

    logger.info(f"Organization operator '{clean_id}' authenticated successfully.")
    token = create_signed_token(clean_id)

    return {
        "success": True,
        "token": token,
        "expiresIn": TOKEN_LIFETIME_SECONDS,
        "organization": {
            "id": "DRISHTI-HQ-01",
            "name": "DRISHTI Disaster Response Command Center",
            "role": "organization",
            "level": "AUTHORIZED_COMMAND_OPERATOR"
        }
    }


@router.get(
    "/verify",
    status_code=status.HTTP_200_OK,
    summary="Verify Organization Session Token",
)
def verify_session(authorization: Optional[str] = Header(None)):
    """
    Validates the bearer session token for protected organization routes.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required.",
        )

    token = authorization.replace("Bearer ", "").strip()
    payload = verify_signed_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please log in again.",
        )

    return {
        "valid": True,
        "organization": {
            "id": "DRISHTI-HQ-01",
            "name": "DRISHTI Disaster Response Command Center",
            "role": "organization",
            "level": "AUTHORIZED_COMMAND_OPERATOR"
        },
        "expiresAt": payload.get("exp")
    }
