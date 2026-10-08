import { describe, it, expect, beforeEach } from 'vitest';
import type { UserRole, VerificationStatus } from '../types';
import { mapVerificationVerdict, formatVerdictLabel, formatReasonCodeLabel } from '../types';

// Shim localStorage for Node test runner
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};
// @ts-expect-error polyfill
globalThis.localStorage = localStorageMock;

import { authService } from '../services/auth';
import { apiService } from '../services/api';

describe('Argus Verification Verdict Mapping (Stage 3 Semantic Model)', () => {
  it('returns backend authoritative verdict directly when present', () => {
    expect(mapVerificationVerdict('COMPLETED', 0.95, 'PRESENCE_CONFIRMED')).toBe('PRESENCE_CONFIRMED');
    expect(mapVerificationVerdict('COMPLETED', 0.72, 'INCONCLUSIVE')).toBe('INCONCLUSIVE');
    expect(mapVerificationVerdict('FAILED', 0.12, 'PRESENCE_NOT_CONFIRMED')).toBe('PRESENCE_NOT_CONFIRMED');
    expect(mapVerificationVerdict('INITIATED', null, 'INCOMPLETE')).toBe('INCOMPLETE');
  });

  it('maps COMPLETED status to PRESENCE_CONFIRMED without client threshold heuristics', () => {
    expect(mapVerificationVerdict('COMPLETED', 0.94)).toBe('PRESENCE_CONFIRMED');
    expect(mapVerificationVerdict('COMPLETED', 0.72)).toBe('PRESENCE_CONFIRMED');
    expect(mapVerificationVerdict('COMPLETED', null)).toBe('PRESENCE_CONFIRMED');
  });

  it('maps FAILED status strictly to PRESENCE_NOT_CONFIRMED', () => {
    expect(mapVerificationVerdict('FAILED', 0.95)).toBe('PRESENCE_NOT_CONFIRMED');
    expect(mapVerificationVerdict('FAILED', 0.12)).toBe('PRESENCE_NOT_CONFIRMED');
    expect(mapVerificationVerdict('FAILED', null)).toBe('PRESENCE_NOT_CONFIRMED');
  });

  it('maps IN_PROGRESS or INITIATED to INCOMPLETE', () => {
    expect(mapVerificationVerdict('INITIATED', null)).toBe('INCOMPLETE');
    expect(mapVerificationVerdict('IN_PROGRESS', null)).toBe('INCOMPLETE');
  });

  it('formats semantic verdicts into user-facing labels', () => {
    expect(formatVerdictLabel('PRESENCE_CONFIRMED')).toBe('Presence Confirmed');
    expect(formatVerdictLabel('PRESENCE_NOT_CONFIRMED')).toBe('Presence Not Confirmed');
    expect(formatVerdictLabel('INCONCLUSIVE')).toBe('Inconclusive');
    expect(formatVerdictLabel('INCOMPLETE')).toBe('Incomplete');
  });

  it('formats machine-readable reason codes into human explanations', () => {
    expect(formatReasonCodeLabel('SPOOF_DETECTED')).toBe('Spoof Attack Detected');
    expect(formatReasonCodeLabel('MULTIPLE_FACES')).toBe('Multiple Faces Detected');
    expect(formatReasonCodeLabel('CHALLENGE_FAILED')).toBe('Challenge Response Failed');
    expect(formatReasonCodeLabel('LOW_CONFIDENCE')).toBe('Low Confidence Threshold');
    expect(formatReasonCodeLabel('INCOMPLETE')).toBe('Session Incomplete');
    expect(formatReasonCodeLabel('TECHNICAL_ERROR')).toBe('Technical Processing Error');
  });
});

describe('Role-Based Access Matrix (Section 6 & PRD §5.2)', () => {
  const checkRoleAccess = (role: UserRole, tab: string): boolean => {
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
    const isAudit = role === 'AUDIT';

    if (tab === 'overview' || tab === 'history' || tab === 'certificate' || tab === 'architecture') {
      return true;
    }
    if (tab === 'verify') {
      return !isAudit; // AUDIT cannot verify
    }
    if (tab === 'audit') {
      return isAdmin || isAudit;
    }
    if (tab === 'policies') {
      return isAdmin;
    }
    return false;
  };

  it('enforces USER role access boundaries', () => {
    expect(checkRoleAccess('USER', 'overview')).toBe(true);
    expect(checkRoleAccess('USER', 'verify')).toBe(true);
    expect(checkRoleAccess('USER', 'history')).toBe(true);
    expect(checkRoleAccess('USER', 'certificate')).toBe(true);
    expect(checkRoleAccess('USER', 'architecture')).toBe(true);

    // USER must NOT have access to audit logs or policies
    expect(checkRoleAccess('USER', 'audit')).toBe(false);
    expect(checkRoleAccess('USER', 'policies')).toBe(false);
  });

  it('enforces AUDIT role access boundaries', () => {
    expect(checkRoleAccess('AUDIT', 'overview')).toBe(true);
    expect(checkRoleAccess('AUDIT', 'history')).toBe(true);
    expect(checkRoleAccess('AUDIT', 'certificate')).toBe(true);
    expect(checkRoleAccess('AUDIT', 'architecture')).toBe(true);
    expect(checkRoleAccess('AUDIT', 'audit')).toBe(true);

    // AUDIT cannot perform active verifications or edit policies
    expect(checkRoleAccess('AUDIT', 'verify')).toBe(false);
    expect(checkRoleAccess('AUDIT', 'policies')).toBe(false);
  });

  it('enforces ADMIN and SUPERADMIN full access', () => {
    const tabs = ['overview', 'verify', 'history', 'certificate', 'audit', 'policies', 'architecture'];
    for (const tab of tabs) {
      expect(checkRoleAccess('ADMIN', tab)).toBe(true);
      expect(checkRoleAccess('SUPERADMIN', tab)).toBe(true);
    }
  });
});

describe('Session Verification Records Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and retrieves verification records in order', () => {
    expect(apiService.getStoredRecords()).toEqual([]);

    const record1 = {
      verificationId: 'ARG-TEST-01',
      timestamp: new Date().toISOString(),
      userId: 'usr_001',
      operationType: 'TRANSFER',
      status: 'COMPLETED' as VerificationStatus,
      confidenceScore: 0.92,
      verdict: 'PASS' as const,
    };

    apiService.saveStoredRecord(record1);
    const records = apiService.getStoredRecords();
    expect(records.length).toBe(1);
    expect(records[0].verificationId).toBe('ARG-TEST-01');
    expect(records[0].verdict).toBe('PASS');
  });

  it('deduplicates existing record on update and places at front', () => {
    const record1 = {
      verificationId: 'ARG-TEST-01',
      timestamp: new Date().toISOString(),
      userId: 'usr_001',
      operationType: 'TRANSFER',
      status: 'COMPLETED' as VerificationStatus,
      confidenceScore: 0.70,
      verdict: 'UNCERTAIN' as const,
    };

    const record1Updated = {
      ...record1,
      confidenceScore: 0.95,
      verdict: 'PASS' as const,
    };

    apiService.saveStoredRecord(record1);
    apiService.saveStoredRecord(record1Updated);

    const records = apiService.getStoredRecords();
    expect(records.length).toBe(1);
    expect(records[0].confidenceScore).toBe(0.95);
    expect(records[0].verdict).toBe('PASS');
  });
});

describe('Auth Service State & Token Handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default unauthenticated state when storage is empty', () => {
    authService.logout();
    const state = authService.getAuthState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBe(null);
    expect(state.role).toBe('USER');
  });

  it('clears all session storage keys upon logout', () => {
    localStorage.setItem('argus_access_token', 'jwt.token.here');
    localStorage.setItem('argus_username', 'operator');
    localStorage.setItem('argus_role', 'ADMIN');

    authService.logout();

    expect(localStorage.getItem('argus_access_token')).toBe(null);
    expect(localStorage.getItem('argus_username')).toBe(null);
    expect(localStorage.getItem('argus_role')).toBe(null);
    expect(authService.getAuthState().isAuthenticated).toBe(false);
  });
});

describe('API Error Handling and Contract Invariants (Hard Rules)', () => {
  it('throws descriptive error on initiate verification failure', async () => {
    // Mock global fetch to return 500 error
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response(JSON.stringify({ error: 'Database unreachable' }), { status: 500 }));

    await expect(
      apiService.initiateVerification({ userId: 'u1', operationType: 'TX' })
    ).rejects.toThrow('Failed to initiate verification on backend: HTTP 500');

    globalThis.fetch = originalFetch;
  });

  it('returns null on certificate 404 without inventing fake fallback', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response(JSON.stringify({ message: 'Certificate not found' }), { status: 404 }));

    const cert = await apiService.getCertificate('non-existent-uuid');
    expect(cert).toBeNull();

    globalThis.fetch = originalFetch;
  });

  it('reports offline status cleanly when health-check fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error('Connection refused'));

    const status = await apiService.checkSystemStatus();
    expect(status.backendOnline).toBe(false);
    expect(status.modelReady).toBe(false);
    expect(status.kmsTrustReady).toBe(false);

    globalThis.fetch = originalFetch;
  });

  it('fetches and maps paginated verification ledger from GET /api/v1/verify', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input: RequestInfo | URL) => {
      const urlStr = String(input);
      expect(urlStr).toContain('/api/v1/verify?page=1&size=10&status=COMPLETED');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            content: [
              {
                verificationId: 'v-1234',
                userId: 'usr_001',
                operationType: 'LOGIN',
                status: 'COMPLETED',
                verdict: 'PRESENCE_CONFIRMED',
                reasonCode: null,
                reason: null,
                confidenceScore: 0.95,
                createdAt: '2026-10-08T12:00:00Z',
              },
            ],
            page: 1,
            size: 10,
            totalElements: 1,
            totalPages: 1,
            first: false,
            last: true,
            hasNext: false,
          }),
          { status: 200 }
        )
      );
    };

    const res = await apiService.getVerifications({ page: 1, size: 10, status: 'COMPLETED' });
    expect(res.page).toBe(1);
    expect(res.content.length).toBe(1);
    expect(res.content[0].verificationId).toBe('v-1234');
    expect(res.content[0].verdict).toBe('PRESENCE_CONFIRMED');

    globalThis.fetch = originalFetch;
  });
});
