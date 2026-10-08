# Argus — Human Verification and Digital Trust Platform

> **Category**: Human Presence Verification  
> **Core Purpose**: Argus evaluates whether sufficient evidence exists that a live human was physically present during a verification event.  
> **Built for**: Google Solution Challenge 2026 / Senior Graduation Project (SGP)

---

## 1. What Argus Is — and What It Is NOT

### Core Purpose
Argus answers a fundamental question for high-stakes digital transactions and online examinations:  
*"Is a live, physical human being physically present in front of the sensor at this specific instant?"*

### Explicit Non-Claims (Truth in Engineering)
- **NOT an identity or KYC provider**: Argus does not verify government IDs, credit histories, or legal names.
- **NOT facial recognition**: Argus does NOT search or enroll user faces into a biometric database.
- **NOT a generic deepfake detector**: Argus focuses specifically on presentation attack detection (screens, masks, printed media) during an active verification session.
- **NOT continuous proctoring**: Argus performs point-in-time snapshot and challenge evaluation; it does NOT continuously monitor or record candidates.
- **NOT guaranteed fraud prevention**: No computational or biometric system can guarantee 100% defense against all synthetic attack vectors.
- **NOT blockchain infrastructure**: Trust is derived from asymmetric public-key cryptography (Google Cloud KMS ECDSA SHA-256) and relational audit trails, not distributed ledgers.

---

## 2. Capabilities Partition: Currently Implemented vs. Demo vs. Roadmap

| Capability | Status | Description |
| :--- | :---: | :--- |
| **Browser Human Verification Studio** | **Implemented** | Precision camera reticle, real-time ROI tracking, interactive prompts |
| **Client-Acquired Optical Pulse (rPPG)** | **Implemented** | In-browser micro-vascular green-channel frequency extraction |
| **Dual-Stage Presentation Attack Detection** | **Implemented** | Server-side ONNX Runtime (MiniFASNetV2-SE) on transient snapshot |
| **Multi-Face Rejection** | **Implemented** | UltraFace Slim 320 blocks proxy attendance with `MULTIPLE_FACES` |
| **Interactive Liveness Challenges** | **Implemented** | Randomized prompt validation (blinks, gaze orientation, head turns) |
| **Point-in-Time Head Pose Telemetry** | **Implemented** | 3D yaw, pitch, roll orientation calculated from submitted snapshot |
| **Backend-Authoritative Decision Engine** | **Implemented** | Bayesian multi-signal fusion against 80.0% confidence threshold |
| **PostgreSQL Verification Ledger** | **Implemented** | Relational verification history with role-based ownership scoping |
| **Relational Security Audit Trail** | **Implemented** | Structured audit logging of events, actors, timestamps, and client IPs |
| **Cryptographic Verification Records** | **Implemented** | Google Cloud KMS ECDSA signatures (or SHA-256 fallback integrity hash) |
| **Operator & Audit Console** | **Implemented** | Role-based management console (USER, ADMIN, SUPERADMIN, AUDIT) |
| **Assessment Entry Gate Portal** | **Demonstration** | Simulated relying-party exam entry workflow gating access on live presence |
| **Production Relying-Party OAuth2/OIDC** | *Roadmap* | Standardized OpenID Connect federation claims for external parties |
| **External API Keys & Service Credentials** | *Roadmap* | Developer portal and third-party service credential management |
| **Hosted Verification Links & Embed SDK** | *Roadmap* | Iframe SDK and hosted verification URLs |
| **Outbound Webhook Delivery** | *Roadmap* | Cryptographically signed asynchronous HTTP event notifications |
| **Public Unauthenticated Cert Verification** | *Roadmap* | Unauthenticated public certificate validation portal |
| **Enterprise Multi-Tenant Hierarchy** | *Roadmap* | Multi-organization isolation and tenant administration |

---

## 3. Multi-Modal Evidence Architecture

```
[ Browser Sensor Ingress ]
  │
  ├── 1. Optical rPPG Sampling ───► Client-acquired micro-vascular pulse dynamics (green spectrum)
  ├── 2. Attention Challenge ──────► Active challenge compliance (blinks, head turns)
  │
  ▼ [ TLS Ingress: Transient 320×240 Snapshot + Telemetry ]
[ Spring Boot 3.4 Backend Orchestrator ]
  │
  ├── 3. UltraFace Slim 320 ──────► Dual-stage face detection (multi-face rejection)
  ├── 4. MiniFASNetV2-SE (ONNX) ──► Server-side presentation attack detection (PAD)
  ├── 5. Head Pose / Orientation ─► Point-in-time 3D posture alignment
  ├── 6. Gemini 2.5 Flash Lite ───► Optional Vertex AI numerical telemetry reasoning (graceful fallback)
  │
  ▼ [ Multi-Signal Bayesian Fusion ]
[ Authoritative Decision: 80.0% Threshold ]
  │
  ├── PASS (≥ 0.80) ──────────────► PRESENCE_CONFIRMED
  ├── FAIL (< 0.80 or Attack) ────► PRESENCE_NOT_CONFIRMED
  └── UNCERTAIN ──────────────────► INCONCLUSIVE
  │
  ▼ [ Ledger Persistence & Cryptographic Attestation ]
[ PostgreSQL Store ] ───► Relational History & Security Audit Trail
[ Google Cloud KMS ] ───► Asymmetric ECDSA SHA-256 Verification Record (or SHA-256 fallback)
```

---

## 4. Privacy & Data Flow Reality

We enforce strict truth in privacy engineering:
- **Webcam Streams**: Processed locally in browser RAM for pulse extraction. Continuous video is **never recorded, stored, or transmitted**.
- **Transient Snapshot**: A single 320×240 JPEG snapshot is transmitted over TLS to `/api/v1/verify/{id}/complete` for server-side ONNX inference. The snapshot is processed in backend RAM and is **not stored in PostgreSQL**.
- **Raw Waveforms**: rPPG time-series waveforms are discarded immediately after in-memory scoring.
- **Persisted Data**: Only derived scalar metrics (confidence score, component scores, estimated BPM, reason codes), verification session metadata, audit logs, and cryptographic certificates are stored in PostgreSQL.
- **Google Cloud Vertex AI / Gemini Privacy**: Only **strictly numerical and categorical telemetry** (reaction times, entropy, pulse statistics) is sent to Gemini. **Zero raw facial images or video frames are ever transmitted to Gemini**. If unavailable, the engine falls back to local heuristic/ONNX evaluation without failure.

---

## 5. Technology Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Precision Neo-Brutalism + Scientific Instrumentation (Tailwind CSS v4 + Vanilla CSS tokens)
- **Typography**: Instrument Serif, IBM Plex Sans, IBM Plex Mono
- **Signal Processing**: In-browser Canvas rPPG green-channel optical frequency sampling

### Backend
- **Framework**: Spring Boot 3.4.3 (Java 21 LTS)
- **Security**: Spring Security with JWT Bearer Authentication and RBAC (`USER`, `ADMIN`, `SUPERADMIN`, `AUDIT`)
- **Database**: PostgreSQL with Spring Data JPA and HikariCP
- **ML / Neural Inference**: ONNX Runtime Java (`MiniFASNetV2-SE` anti-spoofing + `UltraFace Slim 320` face detection)
- **Trust Authority**: Google Cloud KMS (Hardware Security Module ECDSA P-256 with SHA-256) with local deterministic SHA-256 fallback integrity hashing
- **AI Telemetry Reasoning**: Google Cloud Vertex AI SDK (`gemini-2.5-flash-lite`) with automatic local heuristic fallback

---

## 6. Running Locally

### Prerequisites
- Node.js 20+ and npm
- Java 21 JDK
- Maven wrapper (`.\mvnw.cmd`)
- PostgreSQL (or local H2 test configuration)

### Backend Setup
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
Backend runs at `http://localhost:8080`.

### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

### Running Verification Tests
```powershell
# Frontend Unit Tests (Vitest)
cd frontend
npm test -- --run
npm run lint
npm run build

# Backend Unit & Integration Tests (JUnit 5 + Spring Boot Test)
cd backend
.\mvnw.cmd test
```

---

## 7. Demonstration Assessment Workflow

The platform includes a dedicated **Assessment Entry Gate Demonstration** (`/demo`):
1. Demonstrates how an academic testing portal gates high-stakes exam access behind Argus human presence verification.
2. The gate responds exclusively to **real Argus verification outcomes**; no bypass buttons or fake scores exist.
3. If verification passes (`PRESENCE_CONFIRMED`), the practice exam unlocks with interactive questions.
4. If verification fails (`PRESENCE_NOT_CONFIRMED`), access remains strictly locked with human-readable reason codes.
5. Inconclusive or incomplete verifications offer balanced retry flows.

---

## 8. License & Attribution
Built for the **Google Solution Challenge 2026** and university Senior Graduation Project (SGP).
All rights reserved.