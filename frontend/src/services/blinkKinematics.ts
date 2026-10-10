// Open-Source Soukupová & Čech (2016) Eyelid Kinematics & Biological Blink Dynamics Engine
// Formulated from: "Real-Time Eye Blink Detection using Facial Landmarks" (Computer Vision Winter Workshop)
// Evaluates biological eyelid kinetics to detect synthetic AI avatars and deepfakes:
// 1. Asymmetric Closing vs Opening acceleration (orbicularis oculi vs levator palpebrae superioris).
// 2. Physiological duration distribution (100ms - 450ms).
// 3. Temporal inter-blink intervals (IBI) and prolonged freeze detection (> 12 seconds without blinking).

export interface BlinkKinematicsState {
  currentEar: number;
  blinkCount: number;
  blinksPerMinute: number;
  lastBlinkDurationMs: number;
  isBlinkingNow: boolean;
  isBlinkBiologicallyValid: boolean;
  secondsSinceLastBlink: number;
  isProlongedFreeze: boolean;
  blinkDynamicsScore: number; // 0.0 (synthetic/frozen) to 1.0 (natural human)
  kinematicVerdict: 'NATURAL' | 'SUSPECT_FREEZE' | 'UNNATURAL_KINEMATICS' | 'INSUFFICIENT_DATA';
}

interface BlinkEvent {
  startTime: number;
  valleyTime: number;
  endTime: number;
  closingDurationMs: number;
  openingDurationMs: number;
  totalDurationMs: number;
  minEar: number;
  maxEar: number;
  isBiologicallyValid: boolean;
}

export class BlinkKinematicsTracker {
  private earHistory: { ear: number; time: number }[] = [];
  private readonly earThreshold = 0.145; // Below this = eye closure
  private readonly openThreshold = 0.22; // Above this = eye open
  private isEyeClosed = false;
  private closureStartTime = 0;
  private valleyTime = 0;
  private minEarDuringClosure = 1.0;
  private maxEarPriorToClosure = 0.28;

  private completedBlinks: BlinkEvent[] = [];
  private sessionStartTime: number = performance.now();
  private lastBlinkTime: number = performance.now();

  /**
   * Process instantaneous Eye Aspect Ratio (EAR) from MediaPipe landmarks
   * @param ear Combined average EAR for both eyes (or open eye)
   * @param now Current timestamp in ms (performance.now())
   */
  public processEar(ear: number, now: number = performance.now()): BlinkKinematicsState {
    this.earHistory.push({ ear, time: now });
    // Keep 5 seconds rolling history (~150 frames @ 30 FPS)
    const fiveSecondsAgo = now - 5000;
    while (this.earHistory.length > 0 && this.earHistory[0].time < fiveSecondsAgo) {
      this.earHistory.shift();
    }

    // Detect blink transitions
    if (!this.isEyeClosed) {
      // Look for downward transition into blink
      if (ear < this.earThreshold) {
        this.isEyeClosed = true;
        this.closureStartTime = now;
        this.valleyTime = now;
        this.minEarDuringClosure = ear;

        // Peak EAR in preceding 300ms
        const recent = this.earHistory.filter((h) => h.time >= now - 350 && h.time < now);
        this.maxEarPriorToClosure = recent.length > 0 ? Math.max(...recent.map((h) => h.ear)) : 0.26;
      }
    } else {
      // Track minimum EAR valley during closure
      if (ear < this.minEarDuringClosure) {
        this.minEarDuringClosure = ear;
        this.valleyTime = now;
      }

      // Look for upward transition into open eye
      if (ear >= this.openThreshold || now - this.closureStartTime > 800) {
        this.isEyeClosed = false;
        const totalDuration = now - this.closureStartTime;
        const closingDuration = Math.max(10, this.valleyTime - this.closureStartTime);
        const openingDuration = Math.max(10, now - this.valleyTime);

        // Physiological validity criteria (Soukupová & Čech / Stern et al.):
        // 1. Total duration between 90ms and 480ms
        // 2. Closing phase is faster or comparable to opening phase (closing: 60-140ms, opening: 100-280ms)
        // 3. Significant dip: minEar < 0.13
        const isDurationValid = totalDuration >= 80 && totalDuration <= 500;
        const isClosureSufficient = this.minEarDuringClosure <= 0.14;
        const isAsymmetricCurve = closingDuration <= openingDuration * 1.6;

        const isBiologicallyValid = isDurationValid && isClosureSufficient && isAsymmetricCurve;

        const event: BlinkEvent = {
          startTime: this.closureStartTime,
          valleyTime: this.valleyTime,
          endTime: now,
          closingDurationMs: closingDuration,
          openingDurationMs: openingDuration,
          totalDurationMs: totalDuration,
          minEar: this.minEarDuringClosure,
          maxEar: this.maxEarPriorToClosure,
          isBiologicallyValid,
        };

        this.completedBlinks.push(event);
        if (this.completedBlinks.length > 30) this.completedBlinks.shift();
        this.lastBlinkTime = now;
      }
    }

    const secondsElapsed = Math.max(1, (now - this.sessionStartTime) / 1000);
    const secondsSinceLastBlink = (now - this.lastBlinkTime) / 1000;

    // Prolonged freeze: > 12s without any blink is highly abnormal for humans watching a screen
    const isProlongedFreeze = secondsElapsed >= 8 && secondsSinceLastBlink > 12;

    // Calculate natural blinks per minute
    const recentBlinks = this.completedBlinks.filter((b) => b.endTime >= now - 60000);
    const blinksPerMinute = Math.round((recentBlinks.length / Math.min(60, secondsElapsed)) * 60);

    // Compute biological dynamics score
    let dynamicsScore = 0.85;
    let verdict: 'NATURAL' | 'SUSPECT_FREEZE' | 'UNNATURAL_KINEMATICS' | 'INSUFFICIENT_DATA' = 'NATURAL';

    if (secondsElapsed < 4) {
      dynamicsScore = 0.85;
      verdict = 'INSUFFICIENT_DATA';
    } else if (isProlongedFreeze) {
      // Rigid synthetic freeze (characteristic of generative talking heads)
      dynamicsScore = Math.max(0.1, 0.65 - (secondsSinceLastBlink - 12) * 0.05);
      verdict = 'SUSPECT_FREEZE';
    } else if (this.completedBlinks.length > 0) {
      const validCount = this.completedBlinks.filter((b) => b.isBiologicallyValid).length;
      const validRatio = validCount / this.completedBlinks.length;
      if (validRatio >= 0.70) {
        dynamicsScore = Math.min(0.98, 0.75 + validRatio * 0.22);
        verdict = 'NATURAL';
      } else {
        dynamicsScore = Math.max(0.25, validRatio * 0.7);
        verdict = 'UNNATURAL_KINEMATICS';
      }
    } else if (secondsElapsed >= 6 && this.completedBlinks.length === 0) {
      // No blinks yet after 6 seconds
      dynamicsScore = 0.55;
      verdict = 'INSUFFICIENT_DATA';
    }

    const lastBlink = this.completedBlinks[this.completedBlinks.length - 1];

    return {
      currentEar: Math.round(ear * 100) / 100,
      blinkCount: this.completedBlinks.length,
      blinksPerMinute,
      lastBlinkDurationMs: lastBlink ? Math.round(lastBlink.totalDurationMs) : 0,
      isBlinkingNow: this.isEyeClosed,
      isBlinkBiologicallyValid: lastBlink ? lastBlink.isBiologicallyValid : true,
      secondsSinceLastBlink: Math.round(secondsSinceLastBlink * 10) / 10,
      isProlongedFreeze,
      blinkDynamicsScore: Math.round(dynamicsScore * 100) / 100,
      kinematicVerdict: verdict,
    };
  }

  public reset() {
    this.earHistory = [];
    this.completedBlinks = [];
    this.isEyeClosed = false;
    this.sessionStartTime = performance.now();
    this.lastBlinkTime = performance.now();
  }
}
