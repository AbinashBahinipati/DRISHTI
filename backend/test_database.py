"""
DRISHTI Database Connectivity & Table Verification Test
Verifies:
1. DATABASE_URL is loaded from backend/.env
2. PostgreSQL (Supabase) connection succeeds
3. reports table exists and has the expected schema
"""

import sys
from pathlib import Path
from sqlalchemy import inspect, text

# Ensure backend directory is in path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import DATABASE_URL, engine, init_db, get_db_status, settings
from models import ReportModel


def test_database_connection():
    print("=" * 60)
    print(" DRISHTI DATABASE CONNECTIVITY TEST")
    print("=" * 60)

    # 1. Verify DATABASE_URL is loaded
    print("\n[Check 1/3] Checking DATABASE_URL loading...")
    if not DATABASE_URL:
        print("[-] FAIL: DATABASE_URL is not configured or could not be loaded from backend/.env")
        return False

    # Safe display (mask password)
    safe_display = get_db_status()
    print(f"[+] PASS: DATABASE_URL successfully loaded.")
    print(f"    - Dialect: {safe_display.get('dialect', 'postgresql')}")
    print(f"    - Host (Masked): {safe_display.get('host', 'unknown')}")

    # 2. Test Live PostgreSQL Connection
    print("\n[Check 2/3] Testing PostgreSQL (Supabase) connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).fetchone()
            pg_version = result[0] if result else "Unknown"
            print(f"[+] PASS: Live PostgreSQL connection established successfully!")
            print(f"    - PostgreSQL Version: {pg_version[:60]}...")
    except Exception as e:
        print(f"[-] FAIL: PostgreSQL connection failed: {e}")
        return False

    # 3. Verify 'reports' Table Existence and Schema
    print("\n[Check 3/3] Ensuring and verifying 'reports' table...")
    try:
        # Run init_db to ensure table creation if not already present
        init_success = init_db()
        if not init_success:
            print("[-] FAIL: init_db() returned False.")
            return False

        inspector = inspect(engine)
        table_names = inspector.get_table_names()

        if "reports" not in table_names:
            print(f"[-] FAIL: 'reports' table was not found in PostgreSQL tables: {table_names}")
            return False

        # Verify columns
        columns = [col["name"] for col in inspector.get_columns("reports")]
        expected_columns = [
            "id", "origin", "type", "location_name", "latitude", "longitude",
            "description", "media_base64", "urgency", "people_affected",
            "tags", "status", "verification_status", "response_status",
            "assigned_responder", "timestamp", "source_info",
            "ai_analysis", "ml_assessment", "created_at", "updated_at"
        ]

        missing_columns = [col for col in expected_columns if col not in columns]
        if missing_columns:
            print(f"[-] FAIL: Missing required columns in 'reports' table: {missing_columns}")
            return False

        print(f"[+] PASS: 'reports' table exists with all {len(columns)} columns:")
        print(f"    - Columns: {', '.join(columns[:10])}...")
        print(f"    - JSONB fields verified: tags, source_info, ai_analysis, ml_assessment")

        # Verify indexes
        indexes = [idx["name"] for idx in inspector.get_indexes("reports")]
        print(f"    - Table indexes verified: {indexes}")

    except Exception as e:
        print(f"[-] FAIL: Error inspecting 'reports' table: {e}")
        return False

    print("\n" + "=" * 60)
    print(" ALL DATABASE CONNECTIVITY CHECKS PASSED SUCCESSFULLY (3/3)")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)
