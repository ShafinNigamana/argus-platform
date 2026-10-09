# Argus - Biometric Trust & Anti-Spoofing Proctoring Platform

Argus is an autonomous, on-device biometric trust, anti-spoofing liveness verification, and interview anti-cheat proctoring platform running with zero external API keys or cloud dependencies.

## Tech Stack
- **Backend**: Java 21, Spring Boot 3.2.3, Microsoft ONNX Runtime (`onnxruntime 1.17.1`), Maven Wrapper (`mvnw.cmd`).
- **Computer Vision & ML Models**:
  - UltraFace-Slim-320 ONNX (multi-scale anchor face detector with IoU/center-distance NMS).
  - MiniFASNetV2-SE ONNX (feathered multi-scale anti-spoofing classifier).
  - Projective 3D Facial Geometry & Photometric Feature Centroids (bilateral symmetric yaw, ocular pitch & roll pose tracker).
- **Frontend / Client**: Single-page vanilla HTML5 / CSS3 / ES6+ JavaScript, MediaPipe FaceMesh & Iris (478 3D landmarks via WebGL/Wasm), WebRTC camera stream.
- **Testing**: JUnit 5, Mockito, AssertJ, Maven Surefire (60 automated unit & integration tests).

## Architecture & Directory Structure
- `backend/`: Spring Boot Java application root.
  - `src/main/java/com/argus/backend/`: Core service and controller code.
    - `service/OnnxLivenessService.java`: Dual-stage ONNX inference engine (UltraFace + MiniFASNet) and geometric head pose proctoring.
    - `service/VerificationOrchestrator.java`: Biometric pipeline coordination, multi-signal fusion, and cryptographic KMS anchoring.
    - `controller/`: REST API endpoints (`/api/v1/ml/*`, `/api/v1/verify/*`, `/api/v1/session/*`).
    - `model/`: Data transfer objects and entities.
  - `src/main/resources/models/`: Quantized ONNX weights (`version-slim-320.onnx`, `2.7_80x80_MiniFASNetV2.onnx`).
  - `src/main/resources/static/`: Production React frontend build assets and `test_web_app.html`.
  - `src/test/java/`: 67 comprehensive unit & integration tests (`OnnxLivenessServiceTest`, `VerificationPipelineIntegrationTest`, etc.).
- `frontend/`: Modern React 19 + TypeScript + Vite + Tailwind CSS v4 frontend.
  - Role-aware UI navigation (`LoginPage`, `Navigation`, `Header`, `HeroSection`).
  - Interactive studio (`VerificationStudio.tsx`) with real-time rPPG optical pulse waveform canvas and camera lifecycle stabilization.
  - Studio views: `OverviewView`, `PoliciesView`, `AuditTrailView`, `TrustLedgerView`, `HistoryView`, `CertificateView`, `ArchitectureView`.
- `test_web_app.html`: Standalone local client test harness (MediaPipe Iris gaze tracking, EAR blink gating, and symmetrical 3D head movement proctoring).
- `run_all.bat`: Launches both Spring Boot backend (port 8080) and modern React frontend (port 5173).
- `run_backend.bat`: Launches the Spring Boot backend independently.
- `run_frontend.bat`: Launches the Vite frontend dev server independently.
- `stop.bat`: Clean termination script for stopping backend processes.

## How to Run
- **Run Full Stack (Recommended)**: Execute `run_all.bat` (Frontend on `http://localhost:5173/`, Backend on `http://localhost:8080/`).
- **Run Backend Only**: Execute `run_backend.bat` or `.\mvnw.cmd spring-boot:run` in `backend/`.
- **Run Frontend Only**: Execute `run_frontend.bat` or `npm run dev` in `frontend/`.
- **Run Standalone Proctoring Test Harness**: Open `test_web_app.html` directly in any browser or visit `http://localhost:8080/test_web_app.html`.
- **Run Tests**:
  - Backend: `.\mvnw.cmd test` in `backend/` (67 tests).
  - Frontend: `npm test` in `frontend/` (16 tests).

## Key Features
1. **Dual-Stage Liveness Pipeline**:
   - UltraFace-Slim-320 detects frontal and tilted faces in under 20ms.
   - Enforces single-person policy: automatically flags multiple candidates in frame (`MULTIPLE_FACES`).
   - MiniFASNetV2-SE classifies real faces vs screen replays, paper cutouts, and 2D/3D masks.
2. **MediaPipe Iris Gaze & Eye Movement Anti-Cheat**:
   - 478 3D facial landmarks tracked at 60 FPS in WebGL.
   - Eye Aspect Ratio (EAR) gate: prevents false cheating alerts when candidate blinks or closes eyes to rest/think (`EAR < 0.14`).
   - Gaze deviation tracking: flags candidates looking away from the screen (> 30° deviation) with responsive debouncing.
3. **Bilateral Symmetrical 3D Head Movement Tracking**:
   - Projective facial geometry calculates exact yaw from relative nasal-ocular centroid offsets:
     $$\text{noseOffset} = \text{nose}[0] - x_{\text{ocularMidpoint}}$$
     $$\text{yawDeg} = (\text{noseOffset} / (\text{eyeSpan} / 2)) \times 65.0^\circ$$
   - Guarantees mathematical left/right bilateral symmetry ($|\text{yaw}_{\text{left}}| = |\text{yaw}_{\text{right}}|$).
   - Instant proctor alert: Fullscreen red vignette warning banner triggered if candidate turns head $> 30^\circ$ (looking left, right, down at notes/phones, or tilting).
4. **Enterprise Multi-Signal Verification Studio**:
   - Optical rPPG heart rate & signal quality index estimation from facial capillary micro-pulsations.
   - Cryptographic Cloud KMS Ed25519 digital trust certificates and tamper-evident audit trails.

## Recent Changes
- **2026-10-09**: Pulled and merged full modern React 19 UI, role-aware navigation, studio views, and full-stack pipeline from `main`. All 67 backend and 16 frontend tests passing.
- **2026-10-08**: Published architecture, tech stack, and open-source models report in DOCX and PDF formats (`Argus_Tech_Stack_and_Open_Source_Report`).
- **2026-10-08**: Fixed bilateral yaw asymmetry and implemented lighting-invariant projective 3D head yaw tracking across client GPU and ONNX backend.
- **2026-10-08**: Added Eye Aspect Ratio (EAR) gate (`EAR < 0.14`) to suppress false cheating alerts during eye blinks and eye rest.
- **2026-10-08**: Integrated Google MediaPipe Iris 478-point gaze tracking with real-time UI anti-cheat alert banner.
- **2026-10-08**: Added interview anti-cheat head movement detection (> 30° head pose / tilt / yaw / pitch) with fullscreen red vignette alert.
- **2026-10-08**: Calibrated single-person policy with multi-scale NMS face detection in UltraFace.
