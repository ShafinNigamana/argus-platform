// Argus Platform — TypeScript Interfaces and Domain Models
// Derived from PRD §5-6, TDD §4.1-4.2, and Docs/coordination/API_CONTRACT.md

export type VerificationStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'UNCERTAIN';

export type LivenessVerdict = 'PASS' | 'FAIL' | 'UNCERTAIN';

export interface ComponentScores {
  liveness: number;     // 0.0 to 1.0 (Physiological rPPG & facial micro-vascular)
  behavior: number;     // 0.0 to 1.0 (Blink dynamics & head orientation)
  challenge: number;    // 0.0 to 1.0 (Dynamic challenge execution)
  [key: string]: number | undefined;
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
  redirectUrl: string | null;
  createdAt: string;
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
  score: number | null;
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
  userId: string;
  resourceId: string;
  resourceType: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  immutable: boolean;
}

export interface SystemStatus {
  backendOnline: boolean;
  modelReady: boolean;
  kmsTrustReady: boolean;
  modelName: string;
  activePort: number;
  environment: 'development' | 'production' | 'cloud-run';
}

export type ActiveTab = 'overview' | 'verify' | 'certificate' | 'policies' | 'audit' | 'architecture';

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  type: 'BLINK' | 'HEAD_LEFT' | 'HEAD_RIGHT' | 'HOLD_STILL';
  durationSeconds: number;
}
