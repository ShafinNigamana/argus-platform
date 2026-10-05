# Argus Platform — ML / AI Signal Integration Contract

> **Audience**: ML / AI Engineer (`ML-opensource` workstream)  
> **Source of Truth**: PRD §5.1–5.3, TDD §2.3, §5.3, §6.2  
> **Rule**: Backend consumes structured signal packets and scores. No raw video frames are persisted on disk or database.

---

## 1. Architectural Boundaries

```
[Client WebCam / Capture Engine]
               │
               ▼
[MediaPipe / Client/Edge CV Extraction]
               │ (Extracted physiological signals, landmarks, and vectors)
               ▼
[Argus Backend REST / Signal Ingestion]
   ├── LivenessService (rPPG, Blink Frequency, Texture Spoof)
   ├── BehaviorService (Head Pose, Gaze Velocity, Micro-tremors)
   ├── ChallengeService (Deterministic Challenge Validation)
   └── AI Confidence Engine (Synthesis & Weighted Fusion)
               │
               ▼
[Verification Result & Cryptographic Certificate]
```

---

## 2. Ingestion Endpoints for Extracted Signals

### 2.1 Physiological Signal Ingestion
- **Endpoint**: `POST /api/v1/signal`
- **Purpose**: Ingest time-series physiological feature vectors (e.g. green channel rPPG photoplethysmography samples).
- **Payload Schema**:
```json
{
  "sessionId": "sess_817293",
  "timestamp": 1728144000100,
  "signalType": "RPPG",
  "samples": [0.452, 0.458, 0.463, 0.470, 0.468, 0.461]
}
```

### 2.2 Frame Landmark & Pose Signals
- **Endpoint**: `POST /api/v1/frame`
- **Purpose**: Ingest extracted facial geometry, eye aspect ratios (EAR), and head orientation vectors.
- **Payload Schema**:
```json
{
  "sessionId": "sess_817293",
  "frameIndex": 12,
  "timestamp": 1728144000133,
  "earLeft": 0.28,
  "earRight": 0.27,
  "pitch": 2.1,
  "yaw": -1.4,
  "roll": 0.5,
  "landmarkQuality": 0.96
}
```

### 2.3 Behavioral Signals
- **Endpoint**: `POST /api/v1/behavior`
- **Purpose**: Ingest engagement and attention stability metrics computed over multi-frame windows.
- **Payload Schema**:
```json
{
  "sessionId": "sess_817293",
  "attentionScore": 0.94,
  "headStability": 0.88,
  "gazeConsistency": 0.91,
  "anomalousMotionDetected": false
}
```

---

## 3. Confidence Engine Synthesis Model

The backend AI Confidence Engine fuses signal outputs using normalized component weights:

$$C_{total} = w_{live} \cdot S_{live} + w_{beh} \cdot S_{beh} + w_{chl} \cdot S_{chl}$$

Default production weights:
- **Liveness ($w_{live}$)**: `0.45` (spoof rejection, pulse periodicity, eye blink dynamic)
- **Behavior ($w_{beh}$)**: `0.30` (natural micromotion, continuous presence)
- **Challenge ($w_{chl}$)**: `0.25` (prompted response correctness)

Threshold configured dynamically per organization policy (default: `80.0` out of `100.0`).

---

## 4. Privacy & Compliance Guarantees

1. **Zero Raw Video Storage**: No JPEG/PNG/MP4 raw visual assets are ever written to PostgreSQL, Cloud Storage, or Firestore.
2. **Feature-Only Persistence**: Only mathematical features (EAR, rPPG floats, Euler angles) are processed and aggregated.
3. **Audit Trail**: Verification scoring decisions are immutably logged with SHA-256 integrity hashes for forensic auditing.
