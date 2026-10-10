// Argus Platform — API Integration Service
// Communicates with authoritative Spring Boot REST endpoints according to PRD & TDD §4.1.
// 100% In-Memory State & Hardened Session Architecture. Zero browser storage persistence.

import type {
  VerifyRequest,
  VerifyResponse,
  ChallengeRequest,
  ChallengeResponse,
  CertificateResponse,
  Policy,
  AuditLog,
  SystemStatus,
  VerificationHistoryItem,
  PagedResponse,
  UserProfile,
  UpdateProfilePayload,
} from '../types';
import { authService } from './auth';

const API_BASE = '/api/v1';

class ApiService {
  private isBackendAvailable: boolean | null = null;
  // Transient in-memory store for verification history during active UI session
  private inMemoryRecords: Map<string, VerificationHistoryItem[]> = new Map();

  public getBackendAvailable(): boolean | null {
    return this.isBackendAvailable;
  }

  public clearInMemoryData(): void {
    this.inMemoryRecords.clear();
  }

  private getEffectiveUsername(): string {
    const auth = authService.getAuthState();
    return auth.username || 'transient_session';
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const authState = authService.getAuthState();
    let token = authState.accessToken;

    if (!token && authState.refreshToken) {
      token = await authService.refresh();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const csrfToken = authService.getCsrfToken();
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }

    return headers;
  }

  /**
   * Health and status probe (GET /api/v1/verify/health-check)
   */
  public async checkSystemStatus(): Promise<SystemStatus> {
    try {
      const res = await fetch(`${API_BASE}/verify/health-check`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
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
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      throw new Error(`Failed to initiate verification on backend: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Submit face frame for ONNX Presentation Attack Detection (POST /api/v1/verify/{id}/face)
   */
  public async submitFaceFrame(verificationId: string, base64Image: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/verify/${verificationId}/face`, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ image: base64Image }),
    });

    if (!res.ok) {
      throw new Error(`Face anti-spoofing evaluation failed: HTTP ${res.status}`);
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
      credentials: 'same-origin',
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
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        signalQuality: metrics.signalQuality,
        averageBpm: metrics.averageBpm,
        challengePassed: metrics.challengePassed,
        blinkDynamicsScore: metrics.blinkDynamicsScore,
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
      credentials: 'same-origin',
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
        credentials: 'same-origin',
        headers,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
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
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(policy),
    });

    if (!res.ok) {
      throw new Error(`Failed to save policy: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Fetch audit events (GET /api/v1/admin/audit-logs)
   */
  public async getAuditLogs(params?: {
    userId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const headers = await this.getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/admin/audit-logs${queryString}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers,
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Access denied: AUDIT or ADMIN role required to inspect audit trail.');
      }
      if (res.status === 401) {
        throw new Error('Authentication required to access audit trail.');
      }
      throw new Error(`Failed to retrieve audit events: HTTP ${res.status}`);
    }

    const rawLogs = await res.json();
    return rawLogs.map((log: any) => ({
      id: log.id,
      eventType: log.eventType,
      userId: log.userId,
      resourceId: log.resourceId,
      resourceType: log.resourceType,
      actionDetails: log.actionDetails,
      details: log.actionDetails || log.details || '',
      ipAddress: log.ipAddress || '',
      timestamp: log.createdAt || new Date().toISOString(),
      immutable: log.immutable ?? true,
    }));
  }

  /**
   * Fetch paginated verification history from backend (GET /api/v1/verify)
   * Stage 2: Backed by authoritative PostgreSQL ledger with role-based scoping.
   */
  public async getVerifications(params?: {
    page?: number;
    size?: number;
    status?: string;
    operationType?: string;
    userId?: string;
  }): Promise<PagedResponse<VerificationHistoryItem>> {
    const headers = await this.getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.size !== undefined) query.set('size', params.size.toString());
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.operationType && params.operationType !== 'ALL') query.set('operationType', params.operationType);
    if (params?.userId) query.set('userId', params.userId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/verify${queryString}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch verification history: HTTP ${res.status}`);
    }

    const data: PagedResponse<any> = await res.json();
    return {
      ...data,
      content: (data.content || []).map((item: any) => ({
        verificationId: item.verificationId,
        timestamp: item.createdAt || new Date().toISOString(),
        userId: item.userId,
        operationType: item.operationType || 'TRANSACTION_SIGNING',
        status: item.status,
        confidenceScore: item.confidenceScore ?? null,
        verdict: item.verdict,
        reasonCode: item.reasonCode,
        reason: item.reason,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        certificateId: item.certificateId,
      })),
    };
  }

  /**
   * Transient in-memory verification records for Records / History view.
   * Strictly isolated per active authenticated user and never written to browser storage.
   */
  public getStoredRecords(): VerificationHistoryItem[] {
    const user = this.getEffectiveUsername();
    return [...(this.inMemoryRecords.get(user) || [])];
  }

  public saveStoredRecord(record: VerificationHistoryItem): void {
    const user = this.getEffectiveUsername();
    const existing = this.inMemoryRecords.get(user) || [];
    const filtered = existing.filter((r) => r.verificationId !== record.verificationId);
    const updated = [record, ...filtered].slice(0, 50);
    this.inMemoryRecords.set(user, updated);
  }

  public async fetchUserVerifications(): Promise<VerificationHistoryItem[]> {
    try {
      const paged = await this.getVerifications({ page: 0, size: 50 });
      if (paged && Array.isArray(paged.content)) {
        const user = this.getEffectiveUsername();
        const existing = this.inMemoryRecords.get(user) || [];
        const map = new Map<string, VerificationHistoryItem>();
        paged.content.forEach((m) => map.set(m.verificationId, m));
        existing.forEach((e) => map.set(e.verificationId, { ...map.get(e.verificationId), ...e }));
        const combined = Array.from(map.values()).slice(0, 50);
        this.inMemoryRecords.set(user, combined);
        return combined;
      }
    } catch {
      // In-memory fallback if offline
    }
    return this.getStoredRecords();
  }

  /**
   * Fetch authenticated user's account profile and organization metadata (GET /api/v1/account)
   */
  public async getAccountProfile(): Promise<UserProfile> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/account`, {
      method: 'GET',
      credentials: 'same-origin',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch account profile: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Update authenticated user's profile and organization metadata (PATCH /api/v1/account)
   */
  public async updateAccountProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/account`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to update account profile: HTTP ${res.status}`);
    }

    return await res.json();
  }
}

export const apiService = new ApiService();
