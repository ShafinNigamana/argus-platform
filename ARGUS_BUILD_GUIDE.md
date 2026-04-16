# Argus — Build Guide

A distilled, actionable guide for implementing Argus in this Flutter repo. Sourced from the Notion exports in `ARGUS PROJECT GOOGLE SOLUTION CHALLENGE 2026/`. When those specs and this guide disagree, the Notion specs are the source of truth.

---

## 1. What Argus is (one paragraph)

Argus verifies that a **real human is physically in front of the camera** — it does not try to detect whether a video is fake. It combines a physiological signal (heartbeat via rPPG on facial skin), behavioral signals (blinks, head motion), and a challenge–response step, and returns a **Liveness Score (0–100)** plus a tamper-evident record. Target use case: remote video interviews; secondary: KYC, proctoring, media authenticity.

One-line pitch: *"Argus verifies real human presence using heartbeat signals, behavioral analysis, and challenge-response, creating a deepfake-resistant verification system."*

---

## 2. System architecture (big picture)

```
┌───────────────────────────┐     JSON frames     ┌──────────────────────────┐
│  Flutter App (this repo)  │  ───────────────▶   │  Spring Boot (Java)      │
│  - Camera stream          │                     │  - Bandpass + FFT        │
│  - MediaPipe Face Landmks │                     │  - BPM + quality score   │
│  - ROI extraction         │                     │  - Fusion + confidence   │
│  - Challenge UI           │  ◀───────────────   │  - Gemini 1.5 Flash      │
│  - Liveness score display │    Liveness result  │    (behavior reasoning)  │
└───────────────────────────┘                     └──────────────────────────┘
                                                              │
                                                              ▼
                                                  Cloud Run  +  (optional)
                                                  Blockchain trust layer
```

**Layer responsibilities:**

| Layer | Tech | Owns |
|---|---|---|
| Frontend | **Flutter + MediaPipe Face Landmarker** | Camera, face tracking, ROI pixel extraction, frame JSON, challenge UI |
| Backend | Java 17 + Spring Boot | Signal processing (bandpass + FFT), BPM, fusion, API |
| AI layer | Gemini 1.5 Flash | Behavioral reasoning & confidence scoring |
| Deploy | Google Cloud Run | Backend hosting (serverless) |
| Trust (post-MVP) | Google Blockchain Node Engine | Tamper-proof verification hash |

**Guiding principle from the tech-stack doc:** *"Use the right tool for the right job. Prefer simple, reliable solutions over complex ones."* Deterministic math (bandpass + FFT) beats ML where it can; no custom CV models, no training pipelines for the MVP.

---

## 3. Scope of this repo

**This repo is the Flutter frontend only.** The backend and AI layers live in separate services/repos. For the MVP, the Flutter side must deliver **Module 1: Video Capture & Face Tracking** end-to-end before anything else.

Anything in `lib/` is currently the default `flutter create` counter demo — treat it as disposable scaffolding. `lib/main.dart` also has two broken lines (see `CLAUDE.md`).

---

## 4. Module 1 — what "done" means

Module 1 is the **data-quality gatekeeper** for the whole system. Every downstream module (rPPG, behavioral analysis) depends on its output contract, so the contract is **frozen** and must not change without cross-team agreement.

### 4.1 Output contract (strict — do not alter)

Emit one of these per accepted frame:

```json
{
  "frame_id": 1023,
  "timestamp": 1712345678,
  "face_detected": true,
  "face_bbox": { "x": 120, "y": 80, "width": 300, "height": 300 },
  "landmarks": [
    { "x": 0.45, "y": 0.32 },
    { "x": 0.47, "y": 0.35 }
  ],
  "roi": {
    "forehead":    [],
    "left_cheek":  [],
    "right_cheek": []
  },
  "frame_quality": {
    "brightness":    0.72,
    "blur_score":    0.15,
    "face_stability": 0.91
  }
}
```

- `landmarks` coordinates are **normalized** (0–1).
- `roi.*` arrays hold the raw pixel samples used for rPPG (green-channel samples in particular). Keep the field names and order stable.
- If no face is present, emit `face_detected: false` and skip landmarks/ROI — do not drop the frame silently.

### 4.2 Input requirements

- Front camera, minimum **720p**
- **24–30 FPS**, 24 FPS is the floor
- Adequate ambient light
- Single face — if multiple, pick the largest or reject the frame

### 4.3 Success criteria (Definition of Done)

- Face detected in **>95%** of valid frames
- Landmark positions stable frame-to-frame
- ROI regions visually verifiable via debug overlay
- Sustained **≥24 FPS**
- JSON output matches the schema exactly
- Runs continuously without crashes

### 4.4 Edge cases (all must be handled)

| Scenario | Handling |
|---|---|
| No face | `face_detected = false`, skip ROI |
| Multiple faces | Largest face wins, or reject frame |
| Low light | Reflect in `brightness` |
| Motion blur | Reflect in `blur_score` |
| Face partially visible | Reject frame |
| Face too small/far | Reject frame |
| Sudden movement | Lower `face_stability` |

---

## 5. Implementation plan for Module 1 (Flutter)

Execution order matters — don't reorder phases, they gate each other.

### Phase 1 — Camera pipeline
- Initialize the front camera with the `camera` package.
- Lock resolution ≥720p and verify sustained FPS.
- Handle lifecycle: start on screen entry, stop on exit, release on dispose.
- **Deliverable:** camera preview screen.

### Phase 2 — Face detection
- Integrate MediaPipe Face Detection (via `google_mlkit_face_detection` for quick MVP, or a MediaPipe Tasks plugin if available).
- Draw bounding box overlay in debug mode.
- Enforce single-face rule.

### Phase 3 — Landmark extraction
- Switch to / add MediaPipe **Face Landmarker** (the landmark model, not just detection).
- Extract normalized landmarks per frame.
- Render landmark dots in debug mode.

### Phase 4 — ROI selection
- Use landmark indices (confirmed by the AI engineer — task AI-1) to define:
  - **Forehead** (primary for rPPG)
  - **Left cheek** and **right cheek** (secondary)
- Avoid eyes, hair, and shadow zones. Keep ROI stable across frames.
- Extract raw pixel samples (green channel is what rPPG cares about).
- Draw ROI overlays in debug mode.

### Phase 5 — Frame quality metrics
- `brightness` — normalized mean intensity.
- `blur_score` — Laplacian variance.
- `face_stability` — movement delta of bbox center between frames.

### Phase 6 — Frame structuring
- Build the JSON object per frame: incremental `frame_id`, epoch `timestamp`, bbox, landmarks, ROI, quality.
- Schema validation step before emit.

### Phase 7 — Output & debug
- Log JSON to console first; later, stream to backend.
- Verify schema with the backend engineer (task BE-1..BE-5).
- FPS counter visible in debug mode.

### Mandatory integration checkpoint (before moving on)
- Camera feed smooth
- Face detection consistent
- Landmarks stable and visible
- ROI regions correctly positioned and validated by the AI engineer
- JSON output matches the contract exactly

---

## 6. Dependencies to add to `pubspec.yaml`

Use `flutter pub add` so the lockfile stays consistent. Exact packages may need adjustment — verify on pub.dev at the time of install.

```bash
flutter pub add camera                      # camera stream
flutter pub add google_mlkit_face_detection # quick path to face detection / landmarks
flutter pub add permission_handler          # runtime camera permission
flutter pub add http                        # backend POSTs (Phase 7+)
flutter pub add image                       # pixel manipulation if needed
```

If a first-class MediaPipe **Face Landmarker** Flutter binding is available, prefer it over ML Kit for the landmark phase, because the spec explicitly calls for MediaPipe Face Landmarker (not ML Kit face contours) and the AI engineer's landmark index mapping assumes it. For MVP speed, ML Kit is acceptable *provided* the ROI landmark indices are re-validated against whichever model you ship.

Android-side setup:
- `android/app/src/main/AndroidManifest.xml` — `<uses-permission android:name="android.permission.CAMERA"/>`
- Bump `minSdkVersion` per the `camera` package requirement (check its docs).
- Request camera permission at runtime via `permission_handler` before opening the stream.

---

## 7. Suggested `lib/` layout (for when Module 1 work starts)

Not present yet — this is a target structure, not a directive. Keep it flat until complexity demands otherwise.

```
lib/
├── main.dart                   # app entry, route to capture screen
├── app.dart                    # MaterialApp / theme
├── capture/
│   ├── capture_screen.dart     # camera preview + debug overlays
│   ├── camera_controller.dart  # lifecycle wrapper around `camera` package
│   ├── face_tracker.dart       # MediaPipe integration, per-frame detect+landmarks
│   ├── roi_selector.dart       # landmark → ROI pixel extraction
│   ├── frame_quality.dart      # brightness / blur / stability
│   └── frame_builder.dart      # assembles the output-contract JSON
├── models/
│   └── frame_payload.dart      # dart types matching the JSON contract
└── debug/
    └── overlay_painter.dart    # CustomPainter for bbox/landmarks/ROI overlays
```

Rule of thumb: the code that *produces* the frame payload should not know the code that *sends* it. Keep the contract object (`FramePayload`) between them.

---

## 8. MVP scope vs stretch

**Must-have for hackathon submission:**
- Working rPPG → BPM extraction (frontend emits clean ROI samples; backend computes BPM)
- Basic liveness scoring
- Simple challenge–response (blink / head turn)
- Functional UI flow (capture → challenge → score screen)

**Only if time allows:**
- Advanced behavioral AI
- Blockchain trust layer
- Multi-signal optimization

When in doubt: accuracy of heartbeat extraction > everything else. Don't over-engineer, don't add features the judges can't see, don't ship half-done pipelines.

---

## 9. Risks to plan around

- rPPG is sensitive to lighting and motion — enforce quality metrics *before* sending frames
- Signal noise — bandpass filter on the backend, but garbage-in still equals garbage-out
- Real-time performance budget — 24 FPS = ~41 ms/frame for the *entire* Flutter pipeline
- Poor ROI selection breaks the whole system — AI engineer validation is non-negotiable
- Device variability — test on at least two phones before demo day

---

## 10. Spec file map

Canonical specs (read these when in doubt):

- `ARGUS PROJECT GOOGLE SOLUTION CHALLENGE 2026 3417608184bd8009b477d18efda5a40e.md` — index page
- `ARGUS PROJECT GOOGLE SOLUTION CHALLENGE 2026/(IDEA)Argus Real-Time Human Presence Verification  29a7608184bd801f865cc065fe36e451.md` — overall concept, architecture, team responsibilities, MVP scope
- `ARGUS PROJECT GOOGLE SOLUTION CHALLENGE 2026/USER POV OF ARGUS 3417608184bd80c0a719e153d322bed7.md` — user-facing explanation, use cases
- `ARGUS PROJECT GOOGLE SOLUTION CHALLENGE 2026/Argus Technology Stack & Decisions 3417608184bd809e8f3fe259c68ee586.md` — tech choices and rationale
- `ARGUS PROJECT GOOGLE SOLUTION CHALLENGE 2026/Module 1 Video Capture & Face Tracking 3417608184bd803d9057cf6806d2bfc4.md` — Module 1 full spec (output contract lives here)
- `ARGUS PROJECT GOOGLE SOLUTION CHALLENGE 2026/Module 1 Video Capture & Face Tracking/Module 1 Task Breakdown (Teammate Execution Plan) 3417608184bd804a98ffd5ea2c22ce9f.md` — per-role task list

---

## 11. Immediate next actions

1. Fix the two syntax errors in `lib/main.dart` (see `CLAUDE.md`) or replace the file with the new `capture_screen.dart` shell.
2. Add the Phase-1 dependencies (`camera`, `permission_handler`).
3. Wire Android camera permission in the manifest and at runtime.
4. Build the camera preview screen and confirm ≥24 FPS on a real device before touching face detection.
5. Only then move to Phase 2.
