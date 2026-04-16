# Argus — Frontend Progress

Google Solution Challenge 2026. Flutter app for Module 1: Video Capture & Face Tracking. See `ARGUS_BUILD_GUIDE.md` for architecture and `FRONTEND_WORK_PLAN.md` for the phased plan.

## Status snapshot

| Phase | Feature | Status |
|---|---|---|
| 1 | Camera preview, lifecycle, permissions, FPS counter | ✅ done |
| 2 | Face detection, landmarks, bbox + landmark overlay | ✅ done |
| 3 | ROI extraction (forehead + left/right cheek) with debug overlay | ✅ done |
| 4 | Frame quality metrics (brightness, blur, stability) | ⏳ next |
| 5 | Module 1 JSON output contract | ⏳ |
| 6 | Frame buffer + filter + batch (Module 2 frontend side) | ⏳ |
| 7 | Behavioral signals (blink, head motion) | ⏳ |
| 8 | Challenge–response UI + logic | ⏳ |
| 9 | Full UX flow + mock backend | ⏳ |

Tested on: **OnePlus CPH2411, Android 15, API 35**. Sustained **25 FPS** at ~720p with multi-face detection + ROI overlay running in the foreground.

## What's implemented

### Phase 1 — Camera pipeline
- `lib/main.dart` — `ArgusApp` entry, dark Material 3 theme, routes to `CaptureScreen`.
- `lib/capture/capture_screen.dart` — front camera initialization, runtime permission handling (`permission_handler`), lifecycle-aware start/stop of the image stream, per-second FPS counter.
- Android manifest: `CAMERA` permission, front-camera feature requirement, `minSdk` bumped to 21 to satisfy the `camera` plugin.

### Phase 2 — Face detection + landmarks
- `lib/capture/face_tracker.dart` — wraps `google_mlkit_face_detection`'s `FaceDetector` (fast mode, landmarks + contours + tracking). Handles CameraImage → InputImage conversion with back-pressure (no stacking frames).
- Android-specific NV21 path: single-plane fast path when the camera plugin honors `ImageFormatGroup.nv21`, otherwise Dart-side YUV_420_888 → NV21 conversion as a fallback for devices where CameraX refuses NV21.
- Coordinate space: ML Kit returns face coordinates in the **rotated** (upright) space. `_onFrame` swaps width/height for sensor rotations 90°/270° so the painter can map them directly.
- `lib/capture/face_overlay_painter.dart` — `CustomPainter` that draws a purple rounded bbox per face and cyan dots for every landmark. Handles front-camera mirroring.
- Frame throttling: face detection runs on every 2nd frame so the YUV conversion + ML Kit latency doesn't starve the camera delivery loop. FPS counts every frame; detection runs at ~12 Hz.

### Phase 3 — Region of interest
- `lib/capture/roi_selector.dart` — pure geometric selector from `Face` → `FaceRois { forehead, leftCheek, rightCheek }`.
  - **Forehead** — horizontal strip above the eye line, inset 30% from bbox sides to avoid temples, 10% from top to skip hairline.
  - **Cheeks** — centered on ML Kit `leftCheek` / `rightCheek` landmarks when available, falls back to geometry from the eye line and bbox otherwise.
- Painter extended with green forehead rect and amber cheek rects, drawn on top of the face overlay.
- Debug badges: `FPS N`, `FACES N`, `ROI N` (N = faces × 3), bottom `Phase 3 · face + ROI` label.

## Known issues / deferred

- **Multi-face handling** — Module 1 spec §4.4 requires "largest face wins" to keep rPPG signals clean. Currently all detected faces are tracked. To be added in Phase 4 as the first step before quality metrics.
- **Visual Studio incomplete** (Windows desktop builds blocked). Not relevant — Argus targets Android.
- **Kotlin incremental-cache warning** from `camera_android_camerax` during first build: known issue when project + pub cache live on different drive letters (`E:\` vs `C:\`). Non-fatal; build completes.

## Files added / modified in this branch

```
lib/
  main.dart                         (rewritten from flutter create template)
  capture/
    capture_screen.dart             (new)
    face_tracker.dart               (new)
    face_overlay_painter.dart       (new)
    roi_selector.dart               (new)
test/
  widget_test.dart                  (updated for ArgusApp)
pubspec.yaml                        (added camera, permission_handler, google_mlkit_face_detection)
android/app/build.gradle.kts        (minSdk bump to 21)
android/app/src/main/AndroidManifest.xml (camera permission + feature)
CLAUDE.md                           (Claude Code guidance)
ARGUS_BUILD_GUIDE.md                (consolidated build guide from spec)
FRONTEND_WORK_PLAN.md               (phased work plan)
PROGRESS.md                         (this file)
```

## Run it

```bash
flutter pub get
flutter run -d <android-device-id>
```

Check `CLAUDE.md` for the command reference and `ARGUS_BUILD_GUIDE.md` for the Module 1 output contract that Phase 5 will produce.
