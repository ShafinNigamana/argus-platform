# Argus — Current System Architecture & Status

This document provides a technical overview of the Argus Liveness Detection system as of April 25, 2026.

## 1. System Overview
Argus is a multi-modal liveness detection system designed to verify human presence through facial analysis, behavioral tracking, and optical signal extraction (rPPG).

## 2. Backend (Cloud)
The backend is a **Spring Boot 3.5 (Java 21)** application migrated from a local environment to the cloud.

*   **Platform**: Google Cloud Run (Fully Serverless)
*   **Region**: `us-central1`
*   **API Base URL**: `https://argus-backend-824308665988.us-central1.run.app/api/v1`
*   **Deployment**: Automated via Multi-Stage Docker Build (Cloud Build).
*   **Features**: 
    *   RESTful session management.
    *   Green-channel signal processing (FFT-based BPM estimation).
    *   Intelligence Layer with bot detection and reaction time analysis.

## 3. Blockchain Trust Layer (GCP Native)
Instead of a high-cost public blockchain, Argus uses a **Google-Native Cryptographic Ledger** which is mathematically equivalent to a private blockchain and operates within the Free Tier.

*   **Signing Mechanism**: **Google Cloud KMS** (Key Management Service). Uses an Asymmetric Hardware-backed key to digitally sign every verification result.
*   **Chaining**: Every new verification record includes the cryptographic signature of the *previous* record, creating an immutable chain of trust.
*   **Storage**: **Google Cloud Firestore**. Records are stored in the `verification_ledger` collection.
*   **Verification**: Publicly verifiable via `GET /api/v1/verify/{sessionId}`.

## 4. Frontend (Mobile)
The frontend is a **Flutter** application optimized for Android.

*   **Capture Pipeline**: Real-time camera stream with ML Kit Face Detection.
*   **rPPG Extraction**: Extracts Green-channel pixel intensity from the forehead ROI for heart-rate estimation.
*   **Challenge-Response**: "Blink" and "Head Turn" challenges with millisecond-precision reaction tracking to prevent bot/replay attacks.
*   **UI/UX**: Material 3 Dark theme with a dedicated **"Secured by Google Ledger"** badge on the results screen.
*   **Connection**: Automatically connects to the Cloud Run production backend.

## 5. Deployment Info
*   **Project ID**: `argus-gsc-26`
*   **Firestore Database**: `(default)`
*   **KMS Key**: `argus-key` inside `argus-ring` (us-central1)

---
**System Status: ACTIVE & INTEGRATED**
*This system is ready for hackathon demonstration.*
