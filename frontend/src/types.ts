// Argus Platform — TypeScript Interfaces and Domain Models
// Derived from PRD §5-6, TDD §4.1-4.2, and Docs/coordination/API_CONTRACT.md

export type VerificationStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'UNCERTAIN';

/** Authoritative Stage 3 semantic verdict */
export type VerificationVerdict =
  | 'PRESENCE_CONFIRMED'
  | 'PRESENCE_NOT_CONFIRMED'
  | 'INCONCLUSIVE'
  | 'INCOMPLETE';

export type LivenessVerdict = 'PASS' | 'FAIL' | 'UNCERTAIN';

export type UserRole = 'USER' | 'ADMIN' | 'SUPERADMIN' | 'AUDIT';

export interface AuthState {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface ComponentScores {
  liveness?: number;     // 0.0 to 1.0 (Physiological rPPG & facial micro-vascular)
  behavior?: number;     // 0.0 to 1.0 (Blink dynamics & head orientation)
  challenge?: number;    // 0.0 to 1.0 (Dynamic challenge execution)
  [key: string]: unknown;
}

export interface VerifyRequest {
  userId: string;
  operationType: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyResponse {
  verificationId: string;
  status: VerificationStatus;
  confidenceScore: number | null;
  componentScores: ComponentScores | null;
  certificateId?: string;
  redirectUrl: string | null;
  createdAt: string;
  updatedAt?: string;
  verdict?: VerificationVerdict;
  reasonCode?: string;
  reason?: string;
  livenessStatus?: LivenessVerdict;
  failReason?: string | null;
  reasoning?: string;
  bpm?: number;
}

export interface ChallengeRequest {
  challengeId: string;
  response: {
    angleDegrees?: number;
    durationMs?: number;
    blinkCount?: number;
    completed?: boolean;
  };
  timestamp: number;
}

export interface ChallengeResponse {
  verificationId: string;
  challengeId: string;
  valid: boolean;
  score: number;
  status: 'PROCESSED' | 'FAILED';
  message: string;
}

export interface CertificateData {
  verificationId: string;
  userId: string;
  operationType: string;
  confidenceScore: number;
  componentScores: ComponentScores;
  issuedAt: string;
  expiresAt: string;
  issuer: string;
  [key: string]: unknown;
}

export interface CertificateResponse {
  certificateId: string;
  verificationId: string;
  certificateData: CertificateData;
  signature: string;
  publicKey: string | null;
  signingMode?: 'KMS_ASYMMETRIC' | 'SHA256_FALLBACK';
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface Policy {
  id?: string;
  name: string;
  organisation: string;
  confidenceThreshold: number;
  challengeTypes: string[];
  maxDurationSeconds: number;
  active: boolean;
}

export interface AuditLog {
  id: string;
  eventType: string;
  userId?: string | null;
  resourceId?: string | null;
  resourceType?: string | null;
  actionDetails?: string | null;
  details: string;
  ipAddress?: string | null;
  timestamp: string;
  immutable?: boolean;
}

export interface SystemStatus {
  backendOnline: boolean;
  modelReady: boolean;
  kmsTrustReady: boolean;
  modelName: string;
  activePort: number;
  environment: 'development' | 'production' | 'cloud-run';
}

export type ActiveTab = 'overview' | 'verify' | 'history' | 'certificate' | 'policies' | 'audit' | 'architecture';

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  type: 'BLINK' | 'HEAD_LEFT' | 'HEAD_RIGHT' | 'HOLD_STILL';
  durationSeconds: number;
}

export interface VerificationHistoryItem {
  verificationId: string;
  timestamp: string;
  userId: string;
  operationType: string;
  status: VerificationStatus;
  confidenceScore: number | null;
  verdict?: VerificationVerdict | LivenessVerdict;
  reasonCode?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
  certificateId?: string;
  componentScores?: ComponentScores | null;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
}

/**
 * Formats backend semantic verdict into a user-facing label.
 */
export function formatVerdictLabel(verdict?: VerificationVerdict | LivenessVerdict | string): string {
  switch (verdict) {
    case 'PRESENCE_CONFIRMED':
    case 'PASS':
      return 'Presence confirmed';
    case 'PRESENCE_NOT_CONFIRMED':
    case 'FAIL':
      return 'Presence not confirmed';
    case 'INCONCLUSIVE':
    case 'UNCERTAIN':
      return 'Verification inconclusive';
    case 'INCOMPLETE':
      return 'Verification incomplete';
    default:
      return 'Verification incomplete';
  }
}

/**
 * Formats machine-readable reasonCode into human explanation label per Stage 5 specification.
 */
export function formatReasonCodeLabel(code?: string | null): string {
  if (!code) return '';
  switch (code) {
    case 'SPOOF_DETECTED':
      return 'Presentation attack detected';
    case 'MULTIPLE_FACES':
      return 'Multiple faces detected';
    case 'CHALLENGE_FAILED':
      return 'Challenge was not completed successfully';
    case 'LOW_CONFIDENCE':
      return 'Verification evidence did not reach the required confidence threshold';
    case 'INCOMPLETE':
      return 'Verification was not completed';
    case 'TECHNICAL_ERROR':
      return 'Technical processing error';
    default:
      return code.replace(/_/g, ' ');
  }
}

/**
 * Authoritative verdict mapping helper.
 * If backend verdict is provided, it is returned authoritatively.
 * The client no longer invents any 65% threshold heuristics.
 */
export function mapVerificationVerdict(
  status: VerificationStatus,
  _confidenceScore: number | null,
  backendVerdict?: VerificationVerdict
): VerificationVerdict {
  if (backendVerdict) {
    return backendVerdict;
  }
  if (status === 'COMPLETED') {
    return 'PRESENCE_CONFIRMED';
  }
  if (status === 'FAILED') {
    return 'PRESENCE_NOT_CONFIRMED';
  }
  return 'INCOMPLETE';
}

/**
 * Distinguishes true Cloud KMS cryptographic signatures from SHA-256 local integrity hashes.
 * KMS mode produces an asymmetric signature proving origin/authenticity against the configured key.
 * SHA-256 fallback produces an integrity hash only, NOT a cryptographic signature.
 */
export function isKmsSigned(cert: CertificateResponse): boolean {
  if (cert.signingMode === 'KMS_ASYMMETRIC') return true;
  if (cert.signingMode === 'SHA256_FALLBACK') return false;
  return Boolean(
    cert.publicKey &&
    cert.publicKey !== 'ARGUS-PLATFORM-LOCAL-SHA256' &&
    cert.publicKey.includes('PUBLIC KEY')
  );
}

/**
 * Checks whether the certificate has passed its 24-hour expiration window.
 */
export function isCertificateExpired(cert: CertificateResponse): boolean {
  if (!cert.expiresAt) return false;
  return new Date(cert.expiresAt).getTime() < Date.now();
}
