// Argus Platform — API Integration Service
// Implements client-side calls to Spring Boot REST endpoints according to PRD & TDD §4.1.

import type {
  VerifyRequest,
  VerifyResponse,
  ChallengeRequest,
  ChallengeResponse,
  CertificateResponse,
  Policy,
  AuditLog,
  SystemStatus,
} from '../types';

const API_BASE = '/api/v1';

// Local audit events and policies created in this browser
const LOCAL_STORAGE_KEY_AUDIT = 'argus_audit_trail_v1';
const LOCAL_STORAGE_KEY_POLICIES = 'argus_policies_v1';

class ApiService {
  private isBackendAvailable: boolean | null = null;

  public getBackendAvailable(): boolean | null {
    return this.isBackendAvailable;
  }

  /**
   * Health and status probe
   */
  public async checkSystemStatus(): Promise<SystemStatus> {
    try {
      const res = await fetch(API_BASE, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }).catch(() => null);

      // The API root is protected by Spring Security, so 401/403 still means
      // the backend is reachable even when this browser has no admin token.
      if (res?.ok || res?.status === 401 || res?.status === 403) {
        this.isBackendAvailable = true;
        return {
          backendOnline: true,
          modelReady: false,
          kmsTrustReady: false,
          modelName: 'Verification service connected',
          activePort: 8080,
          environment: 'production',
        };
      }
    } catch {
      // Fallback
    }

    this.isBackendAvailable = false;
    return {
      backendOnline: false,
      modelReady: false,
      kmsTrustReady: false,
      modelName: 'Verification service offline',
      activePort: 5173,
      environment: 'development',
    };
  }

  /**
   * Initiate verification session (POST /api/v1/verify)
   */
  public async initiateVerification(request: VerifyRequest): Promise<VerifyResponse> {
    try {
      const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // A local session id is not a backend verification record.
    }

    // Keep a local reference so the UI can show an explicit inconclusive result.
    const vId = 'argus-' + crypto.randomUUID();
    const initiatedResponse: VerifyResponse = {
      verificationId: vId,
      status: 'INITIATED',
      confidenceScore: null,
      componentScores: null,
      redirectUrl: `/verify/${vId}`,
      createdAt: new Date().toISOString(),
    };

    this.logAuditEvent({
      eventType: 'VERIFICATION_INITIATED',
      userId: request.userId,
      resourceId: vId,
      resourceType: 'VERIFICATION',
      details: `Initiated ${request.operationType} verification`,
      ipAddress: 'Not provided by browser',
    });

    return initiatedResponse;
  }

  /**
   * Submit dynamic challenge execution (POST /api/v1/challenges/{verificationId})
   */
  public async submitChallenge(
    verificationId: string,
    challenge: ChallengeRequest
  ): Promise<ChallengeResponse> {
    try {
      const res = await fetch(`${API_BASE}/challenges/${verificationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challenge),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    return {
      verificationId,
      challengeId: challenge.challengeId,
      valid: false,
      score: null,
      status: 'FAILED',
      message: 'Challenge service is unavailable; this action could not be verified.',
    };
  }

  /**
   * Retrieve the authoritative result returned by the verification service
   */
  public async completeVerification(
    verificationId: string,
    metrics: {
      userId: string;
      averageBpm: number;
    }
  ): Promise<VerifyResponse> {
    try {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const res = await fetch(`${API_BASE}/verify/${verificationId}`);
        if (!res.ok) break;
        const data = await res.json();
        if (['COMPLETED', 'FAILED', 'UNCERTAIN'].includes(data.status)) return data;
        if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {
      // Return an explicit inconclusive state below.
    }

    const result: VerifyResponse = {
      verificationId,
      status: 'UNCERTAIN',
      confidenceScore: null,
      componentScores: null,
      redirectUrl: null,
      createdAt: new Date().toISOString(),
      livenessStatus: 'UNCERTAIN',
      bpm: metrics.averageBpm > 0 ? metrics.averageBpm : undefined,
      reasoning: 'The verification service did not return an authoritative result. No confidence score or certificate was generated.',
    };

    this.logAuditEvent({
      eventType: 'VERIFICATION_UNCERTAIN',
      userId: metrics.userId,
      resourceId: verificationId,
      resourceType: 'VERIFICATION',
      details: 'Verification service did not return an authoritative result',
      ipAddress: 'Not provided by browser',
    });

    return result;
  }

  /**
   * Retrieve cryptographic verification certificate (GET /api/v1/verify/{id}/certificate)
   */
  public async getCertificate(verificationId: string): Promise<CertificateResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/verify/${verificationId}/certificate`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Check local cache
    }

    return null;
  }

  /**
   * Fetch active policies (GET /api/v1/admin/policies)
   */
  public async getPolicies(): Promise<Policy[]> {
    if (this.isBackendAvailable !== false) {
      try {
        const res = await fetch(`${API_BASE}/admin/policies`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Use browser-local policies when the backend is unavailable.
      }
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_POLICIES);
    if (stored) {
      try {
        const policies = JSON.parse(stored) as Policy[];
        return policies.filter((policy) => !['pol-001', 'pol-002', 'pol-003'].includes(policy.id || ''));
      } catch {
        // use default
      }
    }
    return [];
  }

  /**
   * Save policies
   */
  public async savePolicy(policy: Policy): Promise<Policy> {
    const policies = await this.getPolicies();
    const id = policy.id || 'pol-' + Date.now().toString(36);
    const updated = [...policies.filter(p => p.id !== id), { ...policy, id }];
    localStorage.setItem(LOCAL_STORAGE_KEY_POLICIES, JSON.stringify(updated));
    return { ...policy, id };
  }

  /**
   * Fetch audit logs (GET /api/v1/admin/audit-logs)
   */
  public async getAuditLogs(): Promise<AuditLog[]> {
    if (this.isBackendAvailable !== false) {
      try {
        const res = await fetch(`${API_BASE}/admin/audit-logs`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Use browser-local events when the backend is unavailable.
      }
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT);
    if (stored) {
      try {
        const logs = JSON.parse(stored) as AuditLog[];
        return logs.filter((log) => !['evt-901', 'evt-902', 'evt-903'].includes(log.id));
      } catch {
        // use initial
      }
    }
    return [];
  }

  /**
   * Record audit log entry
   */
  private logAuditEvent(entry: Omit<AuditLog, 'id' | 'timestamp' | 'immutable'>) {
    const logs = this.getCachedAuditLogs();
    const newLog: AuditLog = {
      ...entry,
      id: 'evt-' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      immutable: false,
    };
    logs.unshift(newLog);
    if (logs.length > 50) logs.pop();
    localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(logs));
  }

  private getCachedAuditLogs(): AuditLog[] {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT);
    if (stored) {
      try {
        const logs = JSON.parse(stored) as AuditLog[];
        return logs.filter((log) => !['evt-901', 'evt-902', 'evt-903'].includes(log.id));
      } catch {
        //
      }
    }
    return [];
  }

}

export const apiService = new ApiService();
