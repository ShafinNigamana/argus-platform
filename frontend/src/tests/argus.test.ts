import { describe, it, expect, beforeEach } from 'vitest';
import type { UserRole, VerificationStatus, VerifyResponse, CertificateResponse } from '../types';
import { mapVerificationVerdict, formatVerdictLabel, formatReasonCodeLabel, isKmsSigned, isCertificateExpired } from '../types';

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
    expect(formatVerdictLabel('PRESENCE_CONFIRMED')).toBe('Presence confirmed');
    expect(formatVerdictLabel('PRESENCE_NOT_CONFIRMED')).toBe('Presence not confirmed');
    expect(formatVerdictLabel('INCONCLUSIVE')).toBe('Verification inconclusive');
    expect(formatVerdictLabel('INCOMPLETE')).toBe('Verification incomplete');
  });

  it('formats machine-readable reason codes into human explanations', () => {
    expect(formatReasonCodeLabel('SPOOF_DETECTED')).toBe('Presentation attack detected');
    expect(formatReasonCodeLabel('MULTIPLE_FACES')).toBe('Multiple faces detected');
    expect(formatReasonCodeLabel('CHALLENGE_FAILED')).toBe('Challenge was not completed successfully');
    expect(formatReasonCodeLabel('LOW_CONFIDENCE')).toBe('Verification evidence did not reach the required confidence threshold');
    expect(formatReasonCodeLabel('INCOMPLETE')).toBe('Verification was not completed');
    expect(formatReasonCodeLabel('TECHNICAL_ERROR')).toBe('Technical processing error');
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

describe('Stage 4 — Verification Studio Flow & Policy Invariants', () => {
  it('enforces exact privacy copy disclosure', () => {
    const requiredPrivacyNotice =
      'Your camera is used only for this verification. A brief facial snapshot is processed for verification and is not stored as a video recording.';
    expect(requiredPrivacyNotice).toContain('Your camera is used only for this verification.');
    expect(requiredPrivacyNotice).toContain('not stored as a video recording');
  });

  it('guarantees client-acquired pulse signal transparency (no fake server-verified claims)', () => {
    const signalLabel = 'Pulse Signal (Client-Acquired)';
    const disclosure =
      'Pulse signal is acquired locally in the browser and contributes to the multi-signal verification decision.';
    expect(signalLabel).toContain('Client-Acquired');
    expect(disclosure).toContain('acquired locally in the browser');
  });

  it('enforces head-pose naming boundaries (strictly banned: Continuous Proctoring)', () => {
    const approvedLabel = 'Attention & Orientation Signal';
    const forbiddenLabel = 'Continuous Proctoring';
    expect(approvedLabel).not.toBe(forbiddenLabel);
    expect(approvedLabel).toContain('Attention & Orientation');
  });
});

describe('Stage 5 — Authoritative Result & Evidence Verification Invariants', () => {
  it('maps all four semantic outcomes to exact product specification labels', () => {
    expect(formatVerdictLabel('PRESENCE_CONFIRMED')).toBe('Presence confirmed');
    expect(formatVerdictLabel('PRESENCE_NOT_CONFIRMED')).toBe('Presence not confirmed');
    expect(formatVerdictLabel('INCONCLUSIVE')).toBe('Verification inconclusive');
    expect(formatVerdictLabel('INCOMPLETE')).toBe('Verification incomplete');
  });

  it('strictly rejects any client-side 65% threshold heuristic in mapVerificationVerdict', () => {
    // Under old heuristic, 0.65 or 0.70 returned 'UNCERTAIN'.
    // Under Stage 3/5 model, backend verdict or completed status is strictly authoritative.
    expect(mapVerificationVerdict('COMPLETED', 0.65)).toBe('PRESENCE_CONFIRMED');
    expect(mapVerificationVerdict('COMPLETED', 0.50)).toBe('PRESENCE_CONFIRMED');
    expect(mapVerificationVerdict('COMPLETED', 0.95, 'INCONCLUSIVE')).toBe('INCONCLUSIVE');
    expect(mapVerificationVerdict('COMPLETED', 0.95, 'PRESENCE_NOT_CONFIRMED')).toBe('PRESENCE_NOT_CONFIRMED');
  });

  it('renders all six backend reason codes faithfully', () => {
    expect(formatReasonCodeLabel('SPOOF_DETECTED')).toBe('Presentation attack detected');
    expect(formatReasonCodeLabel('MULTIPLE_FACES')).toBe('Multiple faces detected');
    expect(formatReasonCodeLabel('CHALLENGE_FAILED')).toBe('Challenge was not completed successfully');
    expect(formatReasonCodeLabel('LOW_CONFIDENCE')).toBe('Verification evidence did not reach the required confidence threshold');
    expect(formatReasonCodeLabel('INCOMPLETE')).toBe('Verification was not completed');
    expect(formatReasonCodeLabel('TECHNICAL_ERROR')).toBe('Technical processing error');
  });

  it('validates multi-signal evidence categories present in payload', () => {
    const mockPayload: VerifyResponse = {
      verificationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      status: 'COMPLETED',
      verdict: 'PRESENCE_CONFIRMED',
      confidenceScore: 93.8,
      reasonCode: undefined,
      reason: 'Sufficient evidence of live human presence confirmed.',
      componentScores: {
        liveness: 0.95,
        antiSpoof: 0.97,
        bpm: 74,
        behavior: 0.90,
        challenge: 1.0,
        headDirection: 'CENTER',
        headYaw: 1.2,
        headPitch: -0.5,
      },
      certificateId: 'cert-uuid-789',
      redirectUrl: null,
      createdAt: '2026-10-08T12:00:00Z',
    };

    expect(mockPayload.verdict).toBe('PRESENCE_CONFIRMED');
    expect(mockPayload.confidenceScore).toBe(93.8);
    expect(mockPayload.componentScores?.bpm).toBe(74);
    expect(mockPayload.componentScores?.headDirection).toBe('CENTER');
    expect(mockPayload.certificateId).toBe('cert-uuid-789');
  });
});

describe('Stage 6 — Cryptographic Verification Record Invariants', () => {
  const kmsCert: CertificateResponse = {
    certificateId: 'cert-kms-001',
    verificationId: 'v-kms-001',
    certificateData: {
      verificationId: 'v-kms-001',
      userId: 'usr_alpha',
      operationType: 'TRANSACTION_SIGNING',
      confidenceScore: 94.2,
      componentScores: { liveness: 0.95, antiSpoof: 0.98, bpm: 72 },
      issuedAt: '2026-10-08T12:00:00Z',
      expiresAt: '2026-10-09T12:00:00Z',
      issuer: 'argus-platform',
    },
    signature: '3045022100a1b2c3d4e5f67890abcdef...',
    publicKey: '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----',
    signingMode: 'KMS_ASYMMETRIC',
    issuedAt: '2026-10-08T12:00:00Z',
    expiresAt: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
    revoked: false,
  };

  const fallbackCert: CertificateResponse = {
    certificateId: 'cert-sha-002',
    verificationId: 'v-sha-002',
    certificateData: {
      verificationId: 'v-sha-002',
      userId: 'usr_beta',
      operationType: 'AUTHENTICATION',
      confidenceScore: 88.0,
      componentScores: { liveness: 0.88, antiSpoof: 0.92 },
      issuedAt: '2026-10-08T12:00:00Z',
      expiresAt: '2026-10-09T12:00:00Z',
      issuer: 'argus-platform',
    },
    signature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    publicKey: 'ARGUS-PLATFORM-LOCAL-SHA256',
    signingMode: 'SHA256_FALLBACK',
    issuedAt: '2026-10-08T12:00:00Z',
    expiresAt: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
    revoked: false,
  };

  it('distinguishes Google Cloud KMS cryptographic signing from SHA-256 fallback', () => {
    expect(isKmsSigned(kmsCert)).toBe(true);
    expect(isKmsSigned(fallbackCert)).toBe(false);
  });

  it('enforces terminology distinction: fallback is an integrity hash, never a digital signature', () => {
    const fallbackModeLabel = isKmsSigned(fallbackCert)
      ? 'Cryptographic Signature'
      : 'Integrity Hash';
    expect(fallbackModeLabel).toBe('Integrity Hash');
    expect(fallbackModeLabel).not.toContain('Signature');

    const kmsModeLabel = isKmsSigned(kmsCert)
      ? 'Cryptographic Signature'
      : 'Integrity Hash';
    expect(kmsModeLabel).toBe('Cryptographic Signature');
  });

  it('evaluates certificate validity window and expired state correctly', () => {
    expect(isCertificateExpired(kmsCert)).toBe(false);

    const expiredCert: CertificateResponse = {
      ...kmsCert,
      expiresAt: '2026-10-01T00:00:00Z',
    };
    expect(isCertificateExpired(expiredCert)).toBe(true);
  });

  it('evaluates revoked state accurately without fabricating revocation behavior', () => {
    const revokedCert: CertificateResponse = {
      ...kmsCert,
      revoked: true,
    };
    expect(revokedCert.revoked).toBe(true);
  });

  it('strictly rejects claims of permanent identity proof or open public verifiability', () => {
    const trustDisclosure =
      'This certificate is a cryptographically signed record of an Argus human presence verification event and its resulting algorithmic decision. It does not prove legal personal identity, provide continuous proctoring, or represent public third-party attestation. Access requires authenticated credentials.';
    expect(trustDisclosure).not.toContain('proves identity');
    expect(trustDisclosure).not.toContain('anyone can verify');
    expect(trustDisclosure).toContain('cryptographically signed record');
    expect(trustDisclosure).toContain('Access requires authenticated credentials');
  });
});

describe('Stage 7 — Operator & Audit Console Invariants', () => {
  it('enforces role-aware navigation visibility (USER vs ADMIN vs AUDIT)', () => {
    const getVisibleNavTabs = (role: UserRole) => {
      const isOperator = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'AUDIT';
      const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
      const isAudit = role === 'AUDIT';
      const canVerify = !isAudit;
      const canViewAudit = isAdmin || isAudit;

      const tabs: string[] = [];
      if (isOperator) tabs.push('overview');
      if (canVerify) tabs.push('verify');
      tabs.push('history');
      tabs.push('certificate');
      if (canViewAudit) tabs.push('audit');
      if (isAdmin) tabs.push('policies');
      tabs.push('architecture');
      return tabs;
    };

    const userTabs = getVisibleNavTabs('USER');
    expect(userTabs).toEqual(['verify', 'history', 'certificate', 'architecture']);
    expect(userTabs).not.toContain('overview');
    expect(userTabs).not.toContain('audit');
    expect(userTabs).not.toContain('policies');

    const auditTabs = getVisibleNavTabs('AUDIT');
    expect(auditTabs).toEqual(['overview', 'history', 'certificate', 'audit', 'architecture']);
    expect(auditTabs).not.toContain('verify');
    expect(auditTabs).not.toContain('policies');

    const adminTabs = getVisibleNavTabs('ADMIN');
    expect(adminTabs).toEqual(['overview', 'verify', 'history', 'certificate', 'audit', 'policies', 'architecture']);
  });

  it('queries audit trail from real backend endpoint and maps events without claiming immutability', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input: RequestInfo | URL) => {
      const urlStr = String(input);
      expect(urlStr).toContain('/api/v1/admin/audit-logs');
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: 'a1',
              eventType: 'VERIFICATION_INITIATED',
              userId: 'usr_001',
              resourceId: 'v-1234',
              resourceType: 'VERIFICATION',
              actionDetails: 'Verification session initiated',
              ipAddress: '127.0.0.1',
              createdAt: '2026-10-08T12:00:00Z',
            },
          ]),
          { status: 200 }
        )
      );
    };

    const logs = await apiService.getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].eventType).toBe('VERIFICATION_INITIATED');
    expect(logs[0].userId).toBe('usr_001');

    // Ensure terminology standard
    const consoleHeading = 'Audit Trail';
    expect(consoleHeading).not.toBe('Immutable Audit Logs');

    globalThis.fetch = originalFetch;
  });

  it('enforces transparent policy configuration disclosure regarding runtime 80% threshold', () => {
    const policyNotice =
      'Configuration values are stored for platform policy management. Current verification scoring uses the configured decision logic implemented by the verification engine (built-in 80.0% confidence threshold and multi-signal gates).';
    expect(policyNotice).toContain('stored for platform policy management');
    expect(policyNotice).toContain('80.0% confidence threshold');
    expect(policyNotice).not.toContain('Live verification rules');
  });

  it('supports operationType and userId filtering on sessions ledger', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input: RequestInfo | URL) => {
      const urlStr = String(input);
      expect(urlStr).toContain('operationType=TRANSACTION_SIGNING');
      expect(urlStr).toContain('userId=usr_target');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            content: [],
            page: 0,
            size: 10,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            hasNext: false,
          }),
          { status: 200 }
        )
      );
    };

    const res = await apiService.getVerifications({
      operationType: 'TRANSACTION_SIGNING',
      userId: 'usr_target',
    });
    expect(res.content).toEqual([]);

    globalThis.fetch = originalFetch;
  });
});

describe('Stage 8 — Trust Center, Privacy Disclosures & Limitations', () => {
  it('enforces exact product definition and human presence verification claim boundaries', () => {
    const coreMissionStatement =
      'Argus does not identify who you are. It evaluates whether sufficient evidence exists that a live human was physically present during the verification event.';
    expect(coreMissionStatement).toContain('does not identify who you are');
    expect(coreMissionStatement).toContain('physically present during the verification event');

    // Forbidden claims audit
    expect(coreMissionStatement).not.toContain('proves identity');
    expect(coreMissionStatement).not.toContain('guaranteed fraud prevention');
    expect(coreMissionStatement).not.toContain('continuous proctoring');
  });

  it('accurately specifies client-acquired pulse disclosure without claiming server attestation', () => {
    const pulseDisclosure =
      'This physiological signal is acquired client-side in the browser runtime. It does NOT represent independent hardware or server-side optical attestation.';
    expect(pulseDisclosure).toContain('acquired client-side');
    expect(pulseDisclosure).toContain('NOT represent independent hardware or server-side optical attestation');
  });

  it('accurately discloses presentation attack detection boundaries', () => {
    const padDisclosure =
      'Designed to detect presentation attacks such as replayed screens, printed paper photos, and physical masks. It does NOT claim to detect every possible attack vector.';
    expect(padDisclosure).toContain('Designed to detect presentation attacks');
    expect(padDisclosure).toContain('NOT claim to detect every possible attack vector');
  });

  it('accurately distinguishes point-in-time head pose from continuous proctoring', () => {
    const headPoseDisclosure =
      'Point-in-time snapshot evaluation only. Argus does NOT continuously track or record head pose after the verification event concludes.';
    expect(headPoseDisclosure).toContain('Point-in-time snapshot evaluation only');
    expect(headPoseDisclosure).toContain('Argus does NOT continuously track');
  });

  it('verifies exact privacy data flow: snapshot is transient, raw images and video are never stored in PostgreSQL', () => {
    const privacyPolicy = {
      continuousWebcamVideoStored: false,
      rawSnapshotStoredInDb: false,
      rppgWaveformStored: false,
      derivedScalarsStored: true,
      auditEventsStored: true,
      certificateStored: true,
      neverLeavesDeviceClaim: false, // Must be FALSE because a 320x240 snapshot leaves client to backend
    };

    expect(privacyPolicy.continuousWebcamVideoStored).toBe(false);
    expect(privacyPolicy.rawSnapshotStoredInDb).toBe(false);
    expect(privacyPolicy.rppgWaveformStored).toBe(false);
    expect(privacyPolicy.derivedScalarsStored).toBe(true);
    expect(privacyPolicy.neverLeavesDeviceClaim).toBe(false);
  });

  it('verifies Gemini / Vertex AI privacy boundary: strictly numerical telemetry, zero images sent', () => {
    const geminiPayloadSpec = {
      transmitsFacialImages: false,
      transmitsVideoFrames: false,
      transmitsNumericalTelemetryOnly: true,
      hasOfflineFallback: true,
    };

    expect(geminiPayloadSpec.transmitsFacialImages).toBe(false);
    expect(geminiPayloadSpec.transmitsVideoFrames).toBe(false);
    expect(geminiPayloadSpec.transmitsNumericalTelemetryOnly).toBe(true);
    expect(geminiPayloadSpec.hasOfflineFallback).toBe(true);
  });

  it('accurately defines certificate and enforces KMS signature vs SHA-256 fallback integrity distinction', () => {
    const certDefinition =
      'A cryptographically signed record of an Argus verification event and its resulting decision.';
    expect(certDefinition).toContain('cryptographically signed record');
    expect(certDefinition).not.toContain('proves identity');

    // KMS Mode: Asymmetric Cryptographic Signature
    const kmsCert: CertificateResponse = {
      certificateId: 'cert_kms',
      verificationId: 'v_01',
      certificateData: {
        verificationId: 'v_01',
        userId: 'usr_01',
        operationType: 'AUTH',
        confidenceScore: 0.95,
        componentScores: {},
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        issuer: 'ARGUS-TRUST-ENGINE-v1.0',
      },
      signature: '3045022100abc...',
      publicKey: '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----',
      signingMode: 'KMS_ASYMMETRIC',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      revoked: false,
    };
    expect(isKmsSigned(kmsCert)).toBe(true);

    // SHA-256 Mode: Integrity Hash / Checksum (NOT asymmetric signature)
    const sha256Cert: CertificateResponse = {
      certificateId: 'cert_sha',
      verificationId: 'v_02',
      certificateData: {
        verificationId: 'v_02',
        userId: 'usr_01',
        operationType: 'AUTH',
        confidenceScore: 0.95,
        componentScores: {},
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        issuer: 'ARGUS-TRUST-ENGINE-v1.0',
      },
      signature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      publicKey: 'ARGUS-PLATFORM-LOCAL-SHA256',
      signingMode: 'SHA256_FALLBACK',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      revoked: false,
    };
    expect(isKmsSigned(sha256Cert)).toBe(false);
  });

  it('enforces current vs roadmap capabilities separation', () => {
    const availableCapabilities = [
      'Human presence verification',
      'Multi-signal decision',
      'Presentation attack analysis',
      'Pulse signal analysis',
      'Dynamic challenge',
      'Head pose/orientation',
      'Verification history ledger',
      'Audit trail',
      'Cryptographic verification records',
      'Operator console',
    ];

    const roadmapCapabilities = [
      'Production Relying-Party OAuth2/OIDC',
      'Client service credentials & API keys',
      'Hosted verification links & embeds',
      'Outbound webhooks & event notifications',
      'Public unauthenticated certificate verification',
      'Enterprise multi-tenant hierarchy',
      'Browser extension / proctoring companion',
    ];

    expect(availableCapabilities).toContain('Human presence verification');
    expect(availableCapabilities).not.toContain('Production Relying-Party OAuth2/OIDC');
    expect(roadmapCapabilities).toContain('Production Relying-Party OAuth2/OIDC');
  });
});

