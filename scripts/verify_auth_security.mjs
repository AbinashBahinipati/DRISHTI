/**
 * DRISHTI Authentication & Route Security Verification Script
 * Validates:
 * 1. POST /api/auth/organization/login with valid credentials
 * 2. POST /api/auth/organization/login rejection of wrong credentials (401)
 * 3. POST /api/auth/organization/login rejection of empty/missing credentials (400)
 * 4. GET /api/auth/organization/verify validates bearer token (200)
 * 5. GET /api/auth/organization/verify rejects invalid token (401)
 * 6. Citizen account credentials cannot access organization endpoints
 * 7. Frontend bundle audit confirms zero server credentials in dist/
 */

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://127.0.0.1:8000';

async function runAuthSecurityAudit() {
  console.log('='.repeat(68));
  console.log(' DRISHTI AUTHENTICATION & SECURITY AUDIT TEST SUITE');
  console.log('='.repeat(68));

  let passedChecks = 0;
  const totalChecks = 7;

  try {
    // 1. Valid Organization Operator Login
    console.log('\n[Check 1/7] Testing valid organization operator login...');
    const loginRes = await fetch(`${API_BASE}/api/auth/organization/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'drishti_admin',
        password: 'DrishtiAdminSecure@2026'
      })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
    }

    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error('Login response missing success or token fields');
    }

    const token = loginData.token;
    console.log('[+] PASS: Organization login succeeded.');
    console.log(`    - Role: ${loginData.organization.role}`);
    console.log(`    - Token format: HMAC-SHA256 Signed Bearer Token`);
    passedChecks++;

    // 2. Reject Wrong Password (401)
    console.log('\n[Check 2/7] Testing wrong organization password rejection (401)...');
    const badPassRes = await fetch(`${API_BASE}/api/auth/organization/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'drishti_admin',
        password: 'AttackerGuessedPassword123'
      })
    });

    if (badPassRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got HTTP ${badPassRes.status}`);
    }
    console.log('[+] PASS: Invalid password correctly rejected with HTTP 401 Unauthorized.');
    passedChecks++;

    // 3. Reject Empty/Missing Credentials (400)
    console.log('\n[Check 3/7] Testing empty credentials rejection (400)...');
    const emptyRes = await fetch(`${API_BASE}/api/auth/organization/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: '', password: '' })
    });

    if (emptyRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got HTTP ${emptyRes.status}`);
    }
    console.log('[+] PASS: Empty credentials rejected with HTTP 400 Bad Request.');
    passedChecks++;

    // 4. Validate Token (200)
    console.log('\n[Check 4/7] Testing bearer token verification...');
    const verifyRes = await fetch(`${API_BASE}/api/auth/organization/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!verifyRes.ok) {
      throw new Error(`Token verification failed with HTTP ${verifyRes.status}`);
    }
    const verifyData = await verifyRes.json();
    if (!verifyData.valid) {
      throw new Error('Token verification returned valid: false');
    }
    console.log('[+] PASS: Bearer token successfully verified by backend.');
    passedChecks++;

    // 5. Reject Tampered Token (401)
    console.log('\n[Check 5/7] Testing tampered token rejection (401)...');
    const tamperedRes = await fetch(`${API_BASE}/api/auth/organization/verify`, {
      headers: { 'Authorization': `Bearer ${token.slice(0, -6)}tamper` }
    });

    if (tamperedRes.status !== 401) {
      throw new Error(`Expected 401 for tampered token, got HTTP ${tamperedRes.status}`);
    }
    console.log('[+] PASS: Tampered token rejected with HTTP 401 Unauthorized.');
    passedChecks++;

    // 6. Citizen Credentials Cannot Authenticate into Organization Endpoint
    console.log('\n[Check 6/7] Testing separation: Citizen accounts cannot access org endpoint...');
    const citizenLoginRes = await fetch(`${API_BASE}/api/auth/organization/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'citizen_user@example.com',
        password: 'CitizenPassword@123'
      })
    });

    if (citizenLoginRes.status !== 401) {
      throw new Error(`Expected 401 for citizen credentials, got HTTP ${citizenLoginRes.status}`);
    }
    console.log('[+] PASS: Citizen accounts strictly barred from organization authentication.');
    passedChecks++;

    // 7. Security Audit: Scan dist/ for leaked credentials
    console.log('\n[Check 7/7] Scanning production dist/ for credential leaks...');
    const distDir = path.resolve('dist');
    let distClean = true;
    const forbiddenPatterns = [
      'DrishtiAdminSecure@2026',
      'Abinash@2006',
      'ORGANIZATION_PASSWORD',
      'DATABASE_URL'
    ];

    if (fs.existsSync(distDir)) {
      const files = fs.readdirSync(path.join(distDir, 'assets'));
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(distDir, 'assets', file), 'utf-8');
          for (const pattern of forbiddenPatterns) {
            if (content.includes(pattern)) {
              console.error(`[-] LEAK DETECTED in dist/assets/${file}: ${pattern}`);
              distClean = false;
            }
          }
        }
      }
    }

    if (!distClean) {
      throw new Error('Credential leak detected in built distribution files!');
    }
    console.log('[+] PASS: Zero server credentials, database strings, or admin passwords found in dist/.');
    passedChecks++;

    console.log('\n' + '='.repeat(68));
    console.log(` ALL AUTHENTICATION SECURITY AUDIT CHECKS PASSED (${passedChecks}/${totalChecks})`);
    console.log('='.repeat(68));
  } catch (err) {
    console.error('\n[-] Authentication Security Audit failed:', err?.message || err);
    process.exit(1);
  }
}

runAuthSecurityAudit();
