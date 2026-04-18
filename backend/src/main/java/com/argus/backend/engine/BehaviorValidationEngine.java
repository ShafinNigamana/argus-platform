package com.argus.backend.engine;

import com.argus.backend.model.BehaviorInput;
import com.argus.backend.model.BehaviorResult;
import com.argus.backend.model.BlinkEvent;
import com.argus.backend.model.HeadMovement;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Deterministic, stateless engine that converts raw behavioral signals
 * (blinks, head movements) into a naturalness score (0.0–1.0).
 *
 * <h3>Blink scoring (3 sub-scores averaged):</h3>
 * <ul>
 *   <li><b>rateScore</b> — blink frequency vs. human norms (10–25/min optimal)</li>
 *   <li><b>durationScore</b> — individual blink durations vs. natural range (100–400ms)</li>
 *   <li><b>spacingScore</b> — inter-blink interval irregularity (CV 0.2–0.8 = natural)</li>
 * </ul>
 *
 * <h3>Movement scoring (2 sub-scores averaged):</h3>
 * <ul>
 *   <li><b>presenceScore</b> — is there actual angular variation?</li>
 *   <li><b>smoothnessScore</b> — are transitions gradual or jumpy?</li>
 * </ul>
 *
 * <p>Final: behaviorScore = blinkScore × 0.5 + movementScore × 0.5
 */
@Component
public class BehaviorValidationEngine {

    // ── Blink rate thresholds (blinks per minute) ──
    private static final double BLINK_RATE_MIN_OPTIMAL = 10.0;
    private static final double BLINK_RATE_MAX_OPTIMAL = 25.0;
    private static final double BLINK_RATE_MIN_ACCEPTABLE = 5.0;
    private static final double BLINK_RATE_MAX_ACCEPTABLE = 40.0;

    // ── Blink duration thresholds (milliseconds) ──
    private static final int BLINK_DURATION_MIN_NATURAL = 100;
    private static final int BLINK_DURATION_MAX_NATURAL = 400;
    private static final int BLINK_DURATION_MIN_VALID = 50;
    private static final int BLINK_DURATION_MAX_VALID = 800;

    // ── Head movement thresholds ──
    private static final double MOVEMENT_MIN_STD_DEV = 0.5;   // minimum angle variation (degrees)
    private static final double MOVEMENT_MAX_JUMP = 30.0;      // max single-step jump (degrees)

    // ── Session constraints ──
    private static final long MIN_SESSION_DURATION_MS = 3000;   // 3 seconds minimum

    // ── Combination weights ──
    private static final double WEIGHT_BLINK = 0.5;
    private static final double WEIGHT_MOVEMENT = 0.5;

    /**
     * Evaluates raw behavioral signals and produces a naturalness score.
     *
     * @param input aggregated behavioral data (may be null)
     * @return BehaviorResult with blinkScore, movementScore, and combined behaviorScore
     */
    public BehaviorResult evaluate(BehaviorInput input) {
        BehaviorResult result = new BehaviorResult();

        // ── Guard: null or too-short session ──
        if (input == null || input.getSessionDuration() < MIN_SESSION_DURATION_MS) {
            result.setBlinkScore(0.0);
            result.setMovementScore(0.0);
            result.setBehaviorScore(0.0);
            return result;
        }

        boolean hasBlinks = input.getBlinkEvents() != null && !input.getBlinkEvents().isEmpty();
        boolean hasMovement = input.getHeadMovements() != null && input.getHeadMovements().size() >= 2;

        double blinkScore = hasBlinks
                ? computeBlinkScore(input.getBlinkEvents(), input.getSessionDuration())
                : 0.0;

        double movementScore = hasMovement
                ? computeMovementScore(input.getHeadMovements())
                : 0.0;

        // ── Adaptive combination ──
        double behaviorScore;
        if (hasBlinks && hasMovement) {
            behaviorScore = (blinkScore * WEIGHT_BLINK) + (movementScore * WEIGHT_MOVEMENT);
        } else if (hasBlinks) {
            behaviorScore = blinkScore;   // 100% weight to available signal
        } else if (hasMovement) {
            behaviorScore = movementScore;
        } else {
            behaviorScore = 0.0;
        }

        result.setBlinkScore(roundTo2(blinkScore));
        result.setMovementScore(roundTo2(movementScore));
        result.setBehaviorScore(roundTo2(behaviorScore));

        return result;
    }

    // ═══════════════════════════════════════════════
    //  BLINK SCORING
    // ═══════════════════════════════════════════════

    private double computeBlinkScore(List<BlinkEvent> blinks, long sessionDuration) {
        double rateScore = computeRateScore(blinks.size(), sessionDuration);
        double durationScore = computeDurationScore(blinks);
        double spacingScore = computeSpacingScore(blinks);

        return (rateScore + durationScore + spacingScore) / 3.0;
    }

    /**
     * Scores blink frequency against human norms.
     *
     * <pre>
     * 10–25 blinks/min  → 1.0 (optimal)
     *  5–10 blinks/min  → 0.5–1.0 (linear ramp)
     * 25–40 blinks/min  → 1.0–0.5 (linear ramp)
     *   <5 or >40       → 0.0
     * </pre>
     */
    private double computeRateScore(int blinkCount, long sessionDuration) {
        double sessionMinutes = sessionDuration / 60000.0;
        if (sessionMinutes <= 0) return 0.0;

        double blinksPerMinute = blinkCount / sessionMinutes;

        if (blinksPerMinute >= BLINK_RATE_MIN_OPTIMAL && blinksPerMinute <= BLINK_RATE_MAX_OPTIMAL) {
            return 1.0;
        } else if (blinksPerMinute >= BLINK_RATE_MIN_ACCEPTABLE && blinksPerMinute < BLINK_RATE_MIN_OPTIMAL) {
            return 0.5 + 0.5 * (blinksPerMinute - BLINK_RATE_MIN_ACCEPTABLE)
                    / (BLINK_RATE_MIN_OPTIMAL - BLINK_RATE_MIN_ACCEPTABLE);
        } else if (blinksPerMinute > BLINK_RATE_MAX_OPTIMAL && blinksPerMinute <= BLINK_RATE_MAX_ACCEPTABLE) {
            return 0.5 + 0.5 * (BLINK_RATE_MAX_ACCEPTABLE - blinksPerMinute)
                    / (BLINK_RATE_MAX_ACCEPTABLE - BLINK_RATE_MAX_OPTIMAL);
        } else {
            return 0.0;
        }
    }

    /**
     * Scores individual blink durations against physiological norms.
     *
     * <pre>
     * 100–400ms → 1.0 (natural)
     *  50–100ms → 0.5 (borderline fast)
     * 400–800ms → 0.5 (borderline slow)
     * outside   → 0.0 (fake or abnormal)
     * </pre>
     */
    private double computeDurationScore(List<BlinkEvent> blinks) {
        double total = 0;
        for (BlinkEvent blink : blinks) {
            int d = blink.getDuration();
            if (d >= BLINK_DURATION_MIN_NATURAL && d <= BLINK_DURATION_MAX_NATURAL) {
                total += 1.0;
            } else if (d >= BLINK_DURATION_MIN_VALID && d < BLINK_DURATION_MIN_NATURAL) {
                total += 0.5;
            } else if (d > BLINK_DURATION_MAX_NATURAL && d <= BLINK_DURATION_MAX_VALID) {
                total += 0.5;
            }
            // else: 0.0 contribution (too fast or too slow)
        }
        return total / blinks.size();
    }

    /**
     * Scores inter-blink interval regularity using coefficient of variation (CV).
     *
     * <pre>
     * CV 0.2–0.8 → 1.0 (natural irregularity)
     * CV < 0.1   → 0.3 (robotic regularity)
     * CV 0.1–0.2 → 0.3–1.0 linear ramp
     * CV 0.8–1.5 → 1.0–0.3 linear ramp
     * CV > 1.5   → 0.3 (chaotically erratic)
     * </pre>
     */
    private double computeSpacingScore(List<BlinkEvent> blinks) {
        if (blinks.size() < 2) return 0.5; // insufficient data, neutral

        double[] intervals = new double[blinks.size() - 1];
        double sum = 0;
        for (int i = 1; i < blinks.size(); i++) {
            intervals[i - 1] = blinks.get(i).getTimestamp() - blinks.get(i - 1).getTimestamp();
            sum += intervals[i - 1];
        }

        double mean = sum / intervals.length;
        if (mean <= 0) return 0.0;

        double varianceSum = 0;
        for (double interval : intervals) {
            varianceSum += (interval - mean) * (interval - mean);
        }
        double stdDev = Math.sqrt(varianceSum / intervals.length);
        double cv = stdDev / mean;

        if (cv >= 0.2 && cv <= 0.8) {
            return 1.0;
        } else if (cv < 0.1) {
            return 0.3;
        } else if (cv < 0.2) {
            return 0.3 + 0.7 * (cv - 0.1) / 0.1;
        } else if (cv > 1.5) {
            return 0.3;
        } else {
            // cv 0.8–1.5: linear decay
            return 1.0 - 0.7 * (cv - 0.8) / 0.7;
        }
    }

    // ═══════════════════════════════════════════════
    //  HEAD MOVEMENT SCORING
    // ═══════════════════════════════════════════════

    private double computeMovementScore(List<HeadMovement> movements) {
        double presenceScore = computePresenceScore(movements);
        double smoothnessScore = computeSmoothnessScore(movements);

        return (presenceScore + smoothnessScore) / 2.0;
    }

    /**
     * Scores whether meaningful head movement exists (not a static photo).
     * Uses standard deviation of angle values.
     *
     * <pre>
     * stdDev ≥ 0.5°  → scaled 0.1–1.0 (capped at 5.0°)
     * stdDev < 0.5°  → proportionally low (likely static)
     * </pre>
     */
    private double computePresenceScore(List<HeadMovement> movements) {
        double sum = 0;
        for (HeadMovement m : movements) {
            sum += m.getAngle();
        }
        double mean = sum / movements.size();

        double varianceSum = 0;
        for (HeadMovement m : movements) {
            double diff = m.getAngle() - mean;
            varianceSum += diff * diff;
        }
        double stdDev = Math.sqrt(varianceSum / movements.size());

        if (stdDev >= MOVEMENT_MIN_STD_DEV) {
            return Math.min(1.0, stdDev / 5.0);
        } else {
            return stdDev / MOVEMENT_MIN_STD_DEV * 0.3;
        }
    }

    /**
     * Scores movement smoothness — natural heads move gradually, not in teleporting jumps.
     * Also penalizes completely zero-delta sequences (static images).
     *
     * <pre>
     * No jumps (>30°)     → 1.0
     * All jumps            → 0.0
     * Near-zero avg delta  → penalized ×0.3
     * </pre>
     */
    private double computeSmoothnessScore(List<HeadMovement> movements) {
        int jumpCount = 0;
        double totalDelta = 0;
        int transitions = movements.size() - 1;

        for (int i = 1; i < movements.size(); i++) {
            double delta = Math.abs(movements.get(i).getAngle() - movements.get(i - 1).getAngle());
            totalDelta += delta;
            if (delta > MOVEMENT_MAX_JUMP) {
                jumpCount++;
            }
        }

        double jumpRatio = (double) jumpCount / transitions;
        double smoothness = 1.0 - jumpRatio;

        // Penalize zero-movement (static image attack)
        double avgDelta = totalDelta / transitions;
        if (avgDelta < 0.1) {
            smoothness *= 0.3;
        }

        return Math.max(0.0, Math.min(1.0, smoothness));
    }

    // ═══════════════════════════════════════════════
    //  UTILITY
    // ═══════════════════════════════════════════════

    private double roundTo2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
