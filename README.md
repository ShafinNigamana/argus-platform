# argus

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

# Argus
# Argus: Real-Time Human Presence Verification Protocol

---

## 1. Project Overview

Argus is a system that verifies whether a **real human is physically present in front of a camera** using **biological and behavioral signals**, instead of relying on traditional deepfake detection.

It changes the approach from:

* “Is this video fake?”
  to
* “Is there a real human present right now?”

---

## 2. Problem Statement

Current deepfake detection systems:

* Depend on AI models that are easily bypassed
* Fail with new deepfake techniques
* Are unreliable in real-world scenarios

This creates a need for a **more robust and future-proof verification method**.

---

## 3. Solution Summary

Argus uses a **multi-signal verification system**:

### A. Physiological Signal (Core)

* Extract heartbeat using rPPG (remote photoplethysmography)
* Detect subtle color changes in facial skin
* Convert signal → BPM (heart rate)

### B. Behavioral Analysis

* Blink detection
* Head movement tracking
* Natural motion patterns

### C. Challenge–Response

* User performs simple actions (e.g., blink, turn head)
* System checks consistency of signals during actions

### D. Confidence-Based Output

* Generates a **Liveness Score (0–100)**
* Avoids binary decisions

### E. Trust Layer

* Converts result into a **verifiable credential**
* Stores hash for tamper-proof verification

---

## 4. System Architecture

### Frontend (Flutter / Android)

* Camera capture
* Face detection (MediaPipe Face Landmarker)
* Region extraction (forehead, cheeks)
* Green-channel signal extraction

---

### Backend (Java / Spring Boot)

* Receive signal data
* Apply:

  * Bandpass filter
  * Fast Fourier Transform (FFT)
* Output:

  * BPM (heart rate)
  * Signal quality score

---

### Intelligence Layer

* Multi-signal fusion
* Behavioral validation
* Confidence scoring

---

### Trust Layer

* Generate liveness hash
* Store verification record (blockchain or secure storage)

---

## 5. End-to-End Flow

1. User opens app
2. Camera captures face
3. Face regions are detected
4. Color signal is extracted
5. Signal sent to backend
6. Backend computes heartbeat (BPM)
7. Behavioral signals analyzed
8. Challenge-response executed
9. System generates liveness score
10. Verification result stored
11. Result returned to user/system

---

## 6. Dataset Strategy

### No dataset required for:

* rPPG signal extraction
* BPM calculation

### Dataset required for:

* Signal validation (noise vs valid signal)
* Behavioral pattern recognition
* Confidence score calibration

Note: Only small, targeted datasets are needed.

---

## 7. MVP Scope (Hackathon Focus)

### Must Have

* Working rPPG → BPM extraction
* Basic liveness scoring
* Simple challenge-response (blink/head movement)
* Functional UI flow

### Optional (if time allows)

* Advanced behavioral AI
* Blockchain integration
* Multi-signal optimization

---

## 8. Target Use Case

### Primary Use Case

* Secure video interviews (prevent impersonation)

### Secondary Use Cases

* KYC identity verification
* Media authenticity verification

---

## 9. Key Differentiation

Argus stands out because:

* Does not rely on deepfake detection models
* Uses **biological signals (heartbeat)**
* Combines **physiology + behavior + interaction**
* Provides **verifiable trust layer**

---

## 10. Known Challenges

* rPPG sensitivity to lighting and motion
* Signal noise handling
* Real-time processing constraints
* Maintaining smooth user experience

---

## 11. Team Responsibilities (Suggested)

### Frontend Team

* Camera integration
* Face tracking
* Signal extraction

### Backend Team

* Signal processing (filter + FFT)
* API design
* BPM calculation

### AI / Data Team

* Behavioral analysis
* Confidence scoring logic
* Dataset preparation

### Integration / DevOps

* System integration
* Deployment (Cloud Run)
* Performance optimization

---

## 12. One-Line Pitch

Argus verifies real human presence using heartbeat signals, behavioral analysis, and challenge-response, creating a deepfake-resistant verification system.

---

## 13. Final Notes

* Focus on working prototype first
* Prioritize accuracy of heartbeat extraction
* Keep system simple and stable
* Avoid over-engineering during MVP

---

**Status: Finalized for Development**
