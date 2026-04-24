# Argus — DevOps & Trust Layer Implementation Summary

This document summarizes the work completed for Module 14 (Deployment) and Module 18 (Trust Layer).

## 1. Cloud Deployment (Module 14)
The backend has been successfully migrated from a local environment to a scalable cloud infrastructure.

*   **Platform**: Google Cloud Run
*   **Region**: `us-central1`
*   **Production URL**: `https://argus-backend-824308665988.us-central1.run.app`
*   **API Base**: `https://argus-backend-824308665988.us-central1.run.app/api/v1`
*   **Containerization**: Implemented a **Multi-Stage Dockerfile** that builds the Java JAR using Maven 3.9/JDK 21 in the cloud, ensuring consistent builds.
*   **Port Mapping**: Configured the application to dynamically bind to the environment `${PORT}` (default 8080).

## 2. Trust Layer (Module 18)
A verifiable, tamper-proof record system has been implemented to ensure the integrity of liveness results.

*   **Verification Service**: Automatically generates a record for every session that reaches a "READY" state.
*   **Hashing Algorithm**: SHA-256 (`sessionId` + `livenessScore` + `timestamp`).
*   **Verification API**: New endpoint at `/api/v1/verify/{sessionId}` allows third parties to retrieve and verify the authenticity of a session's result.
*   **Architecture**: Added `VerificationRecord`, `VerificationStore`, and `VerificationService` components to the backend.

## 3. Frontend Integration
The Flutter application has been updated to connect to the production cloud backend.

*   **ApiService**: Updated `baseUrl` in `frontend/lib/services/api_service.dart` to the production URL.
*   **Connectivity**: The app no longer requires `adb reverse` or local network shared access to reach the backend.

## 4. How to Redeploy
To update the backend with new code changes:

1.  **Commit changes**: `git add .` then `git commit -m "your message"`
2.  **Run Deploy**: 
    ```bash
    cd backend
    gcloud run deploy argus-backend --source . --region us-central1
    ```

---
**Status: DEPLOYED & VERIFIED**
*Date: April 24, 2026*
