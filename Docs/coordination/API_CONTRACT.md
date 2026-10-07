# Argus Platform — Frontend API Integration Contract

> **Audience**: Frontend Engineer (React + TypeScript Web Portal)  
> **Source of Truth**: PRD §5–6, TDD §4.1–4.2, §5.1–5.4  
> **Backend Base URL**: `/api/v1` (Default local: `http://localhost:8080/api/v1`)

---

## 1. Authentication & Security

All secure endpoints require the standard `Authorization` HTTP header with a Bearer token:
```http
Authorization: Bearer <access_token>
```

### 1.1 Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "admin",
  "password": "strongPassword123"
}
```
- **Response `200 OK`**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "role": "ADMIN",
  "username": "admin"
}
```

### 1.2 Register
- **Endpoint**: `POST /api/v1/auth/register`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "analyst1",
  "email": "analyst1@argus-platform.app",
  "password": "strongPassword123",
  "role": "AUDIT"
}
```
- **Response `201 Created`**: Returns `TokenResponse` (same as login).

### 1.3 Refresh Token
- **Endpoint**: `POST /api/v1/auth/refresh?refreshToken=<refreshToken>`
- **Access**: Public
- **Response `200 OK`**: Returns new `TokenResponse`.

---

## 2. Core Verification Workflow

### 2.1 Initiate Verification
- **Endpoint**: `POST /api/v1/verify`
- **Access**: `USER`, `ADMIN`, `SUPERADMIN`
- **Request Body**:
```json
{
  "userId": "usr_99827361",
  "operationType": "HIGH_VALUE_TRANSACTION",
  "metadata": {
    "ipAddress": "192.168.1.1",
    "deviceType": "Chrome / MacOS",
    "amount": 50000
  }
}
```
- **Response `200 OK`**:
```json
{
  "verificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "INITIATED",
  "confidenceScore": null,
  "componentScores": null,
  "redirectUrl": "/verify/3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "createdAt": "2026-10-05T16:00:00Z"
}
```

### 2.2 Poll Verification Status
- **Endpoint**: `GET /api/v1/verify/{verificationId}`
- **Access**: `USER`, `ADMIN`, `SUPERADMIN`
- **Response `200 OK`**:
```json
{
  "verificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "COMPLETED",
  "confidenceScore": 92.5,
  "componentScores": {
    "liveness": 0.94,
    "behavior": 0.89,
    "challenge": 1.0
  },
  "redirectUrl": null,
  "createdAt": "2026-10-05T16:00:00Z"
}
```
*Possible Status Values*: `INITIATED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`.

### 2.3 Submit Challenge Response
- **Endpoint**: `POST /api/v1/challenges/{verificationId}`
- **Access**: `USER`, `ADMIN`, `SUPERADMIN`
- **Request Body**:
```json
{
  "challengeId": "chl_turn_left",
  "response": {
    "angleDegrees": -35.2,
    "durationMs": 1200
  },
  "timestamp": 1728144000000
}
```
- **Response `200 OK`**:
```json
{
  "verificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "challengeId": "chl_turn_left",
  "valid": true,
  "score": 1.0,
  "status": "PROCESSED",
  "message": "Challenge validated successfully"
}
```

### 2.4 Retrieve Cryptographic Certificate
- **Endpoint**: `GET /api/v1/verify/{verificationId}/certificate`
- **Access**: `USER`, `ADMIN`, `SUPERADMIN`
- **Response `200 OK`**:
```json
{
  "certificateId": "8fa85f64-5717-4562-b3fc-2c963f66afa8",
  "verificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "certificateData": {
    "verificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "userId": "usr_99827361",
    "operationType": "HIGH_VALUE_TRANSACTION",
    "confidenceScore": 92.5,
    "componentScores": {
      "liveness": 0.94,
      "behavior": 0.89,
      "challenge": 1.0
    },
    "issuedAt": "2026-10-05T16:01:00Z",
    "expiresAt": "2026-10-06T16:01:00Z",
    "issuer": "argus-platform"
  },
  "signature": "3a7b9c1d...",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
  "issuedAt": "2026-10-05T16:01:00Z",
  "expiresAt": "2026-10-06T16:01:00Z",
  "revoked": false
}
```

### 2.5 Submit Face Anti-Spoofing Frame
- **Endpoint**: `POST /api/v1/verify/{verificationId}/face`
- **Access**: `USER`, `ADMIN`, `SUPERADMIN`
- **Request Body**:
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```
- **Response `200 OK`**:
```json
{
  "isReal": true,
  "livenessScore": 0.965,
  "confidence": "HIGH",
  "classification": "REAL",
  "reasoning": "Live human subject verified via MiniFASNetV2-SE optical texture analysis.",
  "inferenceTimeMs": 24
}
```

### 2.6 Multi-Signal Verification Completion
- **Endpoint**: `POST /api/v1/verify/{verificationId}/complete`
- **Access**: `USER`, `ADMIN`, `SUPERADMIN`
- **Request Body**:
```json
{
  "signalQuality": 0.94,
  "averageBpm": 74.0,
  "challengePassed": true,
  "blinkDynamicsScore": 0.92,
  "behaviorScore": 0.90,
  "image": "data:image/jpeg;base64,... (optional)",
  "telemetry": {}
}
```
- **Response `200 OK`**:
```json
{
  "verificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "COMPLETED",
  "confidenceScore": 93.8,
  "componentScores": {
    "liveness": 0.95,
    "rppgQuality": 0.94,
    "bpm": 74.0,
    "behavior": 0.90,
    "challenge": 1.0,
    "antiSpoof": 0.97,
    "aiConfidence": "HIGH",
    "reasoning": "Multi-modal signal synthesis authenticates human presence."
  },
  "certificateId": "8fa85f64-5717-4562-b3fc-2c963f66afa8",
  "createdAt": "2026-10-05T16:00:00Z",
  "updatedAt": "2026-10-05T16:00:45Z"
}
```

### 2.7 Verification Health Check Probe
- **Endpoint**: `GET /api/v1/verify/health-check`
- **Access**: Public
- **Response `200 OK`**:
```json
{
  "status": "UP",
  "backendOnline": true,
  "modelReady": true,
  "kmsTrustReady": true,
  "modelName": "MiniFASNetV2-SE + UltraFace Slim 320",
  "service": "Argus Verification Core"
}
```

### 2.8 Standalone Face PAD & Model Status
- **Endpoints**:
  - `GET /api/v1/ml/status` (Public)
  - `POST /api/v1/verify-face` (Public, JSON with `image` Base64 or multipart)
- **Response `200 OK`**: Returns `AntiSpoofResponse`

---

## 3. Administration & Compliance

### 3.1 Create Policy
- **Endpoint**: `POST /api/v1/admin/policies`
- **Access**: `ADMIN`, `SUPERADMIN`
- **Request Body**:
```json
{
  "name": "Strict Banking Policy",
  "organisation": "Acme Bank",
  "confidenceThreshold": 85.0,
  "challengeTypes": ["HEAD_TURN", "BLINK", "GAZE_FOLLOW"],
  "maxDurationSeconds": 60,
  "active": true
}
```
- **Response `201 Created`**: Returns created `Policy` entity.

### 3.2 Query Audit Logs
- **Endpoint**: `GET /api/v1/admin/audit-logs`
- **Access**: `AUDIT`, `ADMIN`, `SUPERADMIN`
- **Query Parameters**:
  - `startDate` (optional, ISO date e.g. `2026-10-01`)
  - `endDate` (optional, ISO date e.g. `2026-10-05`)
  - `userId` (optional, string)
  - `limit` (optional, integer default 100)
- **Response `200 OK`**: Array of `AuditLog` records.

---

## 4. Standard Error Format (TDD §4.2)

All errors return JSON matching the schema:
```json
{
  "status": 400,
  "errorCode": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "requestId": "9bc30e37-a82f-4882-a0bc-9e53bf903828",
  "timestamp": 1728144000000,
  "details": {
    "userId": "userId is required"
  }
}
```

### Rate Limiting (TDD §5.4)
- **Limit**: 100 requests per minute per IP / authenticated user.
- **When Exceeded**: Returns HTTP `429 Too Many Requests`.
- **Response Headers**: `Retry-After: <seconds>`, `X-Rate-Limit-Remaining: 0`.

---

## 5. TypeScript Interfaces

```typescript
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  role: 'USER' | 'ADMIN' | 'AUDIT' | 'SUPERADMIN';
  username: string;
}

export interface VerifyRequest {
  userId: string;
  operationType: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyResponse {
  verificationId: string;
  status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  confidenceScore: number | null;
  componentScores: {
    liveness?: number;
    behavior?: number;
    challenge?: number;
    [key: string]: unknown;
  } | null;
  redirectUrl: string | null;
  createdAt: string;
}

export interface CertificateResponse {
  certificateId: string;
  verificationId: string;
  certificateData: Record<string, unknown>;
  signature: string;
  publicKey: string | null;
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface ApiError {
  status: number;
  errorCode: string;
  message: string;
  requestId: string;
  timestamp: number;
  details?: Record<string, unknown>;
}
```
