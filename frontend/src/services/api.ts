// Argus Platform — API Integration Service
// Communicates with authoritative Spring Boot REST endpoints according to PRD & TDD §4.1.

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

class ApiService {
  private isBackendAvailable: boolean | null = null;
  private authToken: string | null = null;

  constructor() {
    this.authToken = localStorage.getItem('argus_access_token');
  }

  public getBackendAvailable(): boolean | null {
    return this.isBackendAvailable;
  }

  public setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('argus_access_token', token);
  }

  public getAuthToken(): string | null {
    if (!this.authToken) {
      this.authToken = localStorage.getItem('argus_access_token');
    }
    return this.authToken;
  }

  /**
   * Helper to ensure an authenticated session with Spring Boot.
   * Auto-acquires a JWT token if none is present.
   */
  public async ensureAuthenticated(): Promise<string> {
    const existing = this.getAuthToken();
    if (existing) {
      return existing;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'user',
          password: 'userPassword123',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          this.setAuthToken(data.accessToken);
          return data.accessToken;
        }
      }
    } catch {
      // Backend not reached
    }

    return '';
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.ensureAuthenticated();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Health and status probe (GET /api/v1/verify/health-check & /api/v1/ml/status)
   */
  public async checkSystemStatus(): Promise<SystemStatus> {
    try {
      const res = await fetch(`${API_BASE}/verify/health-check`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        this.isBackendAvailable = true;
        return {
          backendOnline: true,
          modelReady: data.modelReady ?? true,
          kmsTrustReady: data.kmsTrustReady ?? true,
          modelName: data.modelName ?? 'MiniFASNetV2-SE + UltraFace Slim 320',
          activePort: 8080,
          environment: 'production',
        };
      }
    } catch {
      // Backend offline
    }

    this.isBackendAvailable = false;
    return {
      backendOnline: false,
      modelReady: false,
      kmsTrustReady: false,
      modelName: 'Offline / Disconnected',
      activePort: 8080,
      environment: 'development',
    };
  }

  /**
   * Initiate verification session (POST /api/v1/verify)
   */
  public async initiateVerification(request: VerifyRequest): Promise<VerifyResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      throw new Error(`Failed to initiate verification on backend: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Submit dynamic challenge execution (POST /api/v1/challenges/{verificationId})
   */
  public async submitChallenge(
    verificationId: string,
    challenge: ChallengeRequest
  ): Promise<ChallengeResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/challenges/${verificationId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(challenge),
    });

    if (!res.ok) {
      throw new Error(`Challenge submission failed: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Complete multi-signal verification and retrieve authoritative verdict (POST /api/v1/verify/{verificationId}/complete)
   * The backend fuses rPPG, Behavior, Challenge, ONNX/PAD, and AI reasoning to issue the KMS certificate.
   */
  public async completeVerification(
    verificationId: string,
    metrics: {
      userId: string;
      operationType: string;
      signalQuality: number;
      averageBpm: number;
      challengePassed: boolean;
      blinkDynamicsScore: number;
      image?: string;
    }
  ): Promise<VerifyResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/verify/${verificationId}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        signalQuality: metrics.signalQuality,
        averageBpm: metrics.averageBpm,
        challengePassed: metrics.challengePassed,
        blinkDynamicsScore: metrics.blinkDynamicsScore,
        behaviorScore: metrics.blinkDynamicsScore,
        image: metrics.image,
      }),
    });

    if (!res.ok) {
      throw new Error(`Verification completion failed on backend: HTTP ${res.status}`);
    }

    const data: VerifyResponse = await res.json();
    return data;
  }

  /**
   * Retrieve cryptographic verification certificate (GET /api/v1/verify/{id}/certificate)
   */
  public async getCertificate(verificationId: string): Promise<CertificateResponse | null> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/verify/${verificationId}/certificate`, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      return null;
    }

    throw new Error(`Failed to retrieve certificate: HTTP ${res.status}`);
  }

  /**
   * Fetch active policies (GET /api/v1/admin/policies)
   */
  public async getPolicies(): Promise<Policy[]> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE}/admin/policies`, {
        method: 'GET',
        headers,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to empty if offline
    }
    return [];
  }

  /**
   * Save policy (POST /api/v1/admin/policies)
   */
  public async savePolicy(policy: Policy): Promise<Policy> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/admin/policies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(policy),
    });

    if (!res.ok) {
      throw new Error(`Failed to save policy: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Fetch audit logs (GET /api/v1/admin/audit-logs)
   */
  public async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE}/admin/audit-logs`, {
        method: 'GET',
        headers,
      });
      if (res.ok) {
        const rawLogs = await res.json();
        return rawLogs.map((log: any) => ({
          id: log.id,
          eventType: log.eventType,
          userId: log.userId,
          resourceId: log.resourceId,
          resourceType: log.resourceType,
          details: log.actionDetails || log.details || '',
          ipAddress: log.ipAddress || '',
          timestamp: log.createdAt || new Date().toISOString(),
          immutable: log.immutable ?? true,
        }));
      }
    } catch {
      // Fallback to empty if offline
    }
    return [];
  }
}

export const apiService = new ApiService();
