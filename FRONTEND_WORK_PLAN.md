# Frontend Independent Work Plan (Across Modules)

## 1. Objective

This document defines all work that the frontend developer can complete independently, without waiting for backend, AI, or DevOps.

The goal is to:

- Maximize development progress early
- Build a working product flow
- Prepare the system for smooth integration later

## 2. Scope of Work

The frontend developer will work across multiple modules:

- Module 1: Video Capture & Face Tracking (Complete)
- Module 2: Data Pipeline (Frontend side)
- Module 6: Behavioral Signals (Basic version)
- Module 7: Challenge–Response System (UI + logic)
- UX Layer (Full app flow)
- Debug & Visualization Tools

## 3. Work Breakdown (Step-by-Step)

### Phase 1: Core Camera and Face System (Module 1)

Tasks:

- Implement front camera preview in Flutter
- Maintain frame rate between 24–30 FPS
- Integrate MediaPipe Face Detection
- Detect face in each frame
- Draw bounding box on detected face
- Integrate MediaPipe Face Landmarker
- Extract facial landmarks
- Display landmarks (debug mode)

### Phase 2: ROI (Region of Interest) Extraction

Tasks:

- Identify forehead region using landmarks
- Identify left and right cheek regions
- Extract pixel data from these regions
- Display ROI areas visually on screen
- Ensure ROI avoids:
  - Eyes
  - Hair
  - Shadow regions

### Phase 3: Frame Quality Metrics

Tasks:

- Calculate brightness (average pixel intensity)
- Detect blur using Laplacian method
- Measure face stability:
  - Track face position across frames
  - Calculate movement difference
- Display:
  - Brightness indicator
  - Blur score
  - Stability score

### Phase 4: Frame Data Structuring

Tasks:

- Create structured JSON per frame
- Include:
  - `frame_id`
  - `timestamp`
  - `face_bbox`
  - `landmarks`
  - ROI data
  - `frame_quality`
- Print JSON output in console

### Phase 5: Data Pipeline (Module 2 — Frontend Side)

Tasks:

- Implement frame buffer:
  - Store last 200–300 frames
- Implement frame filtering:
  - Drop frames if:
    - No face detected
    - Low brightness
    - High blur
- Implement batching:
  - Group frames into chunks
- Create stream manager:
  - Continuous stream mode
  - Batch mode

### Phase 6: Behavioral Signals (Basic — Module 6)

Tasks:

- Implement basic blink detection:
  - Use eye landmarks
  - Detect eye open/close
- Implement head movement detection:
  - Track landmark shifts
  - Detect left/right movement
- Track motion consistency:
  - Compare movement across frames

### Phase 7: Challenge–Response System (Module 7)

Tasks:

#### A. UI

- Display instructions:
  - "Blink twice"
  - "Turn head left"
- Add countdown timer

#### B. Action Tracking

- Detect if user performed required action
- Record:
  - Start time
  - End time
  - Success or failure

#### C. Event Logging

Create structure:

```json
{
  "challenge": "blink_twice",
  "start_time": 123,
  "end_time": 130,
  "status": "success"
}
```

### Phase 8: UX Flow (Full Application)

Build Screens:

- Face alignment screen
- Camera capture screen
- Challenge screen
- Processing screen
- Result screen (use mock data)

### Phase 9: Debug & Visualization Tools

Tasks:

- Toggle for landmarks ON/OFF
- Toggle for ROI visualization
- FPS display
- Brightness indicator
- Stability indicator

### Phase 10: Mock Backend Integration

Since backend is not ready:

Tasks:

- Create mock response:

  ```json
  {
    "liveness_score": 75,
    "status": "PASS"
  }
  ```

- Show result on UI
- Complete full app flow using mock data

## 4. Expected Output

By completing this work, frontend should be able to demonstrate:

- Live face detection and tracking
- Landmark visualization
- ROI extraction (forehead and cheeks)
- Frame quality analysis
- Blink detection
- Head movement tracking
- Challenge-response system
- Complete UI flow
- Mock liveness result

## 5. Important Guidelines

- Do not wait for backend or AI
- Use mock data wherever needed
- Keep output structure consistent
- Focus on stability and performance
- Ensure smooth user experience

## 6. Definition of Completion

Frontend work is considered complete when:

- System runs continuously without crash
- Face tracking is stable
- ROI is correctly positioned
- Challenge system works correctly
- Full app flow is functional
- Mock result is displayed

## 7. Notes

- This work will accelerate overall development significantly
- Backend and AI will integrate later on top of this
- Debug tools are mandatory for future modules
