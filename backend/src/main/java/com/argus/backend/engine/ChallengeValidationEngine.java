package com.argus.backend.engine;

import com.argus.backend.model.ChallengeEvent;
import com.argus.backend.model.ChallengeInput;
import com.argus.backend.model.ChallengeResult;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Deterministic, stateless engine that validates challenge–response execution.
 * Converts raw challenge events into a challengeScore (0.0–1.0).
 *
 * <p>Supported challenge types: {@code BLINK}, {@code HEAD_TURN}.
 *
 * <h3>Scoring weights:</h3>
 * <ul>
 *   <li><b>correctnessScore</b> × 50% — did the user perform the correct action?</li>
 *   <li><b>timingScore</b> × 30% — was the response within human reaction norms?</li>
 *   <li><b>naturalnessScore</b> × 20% — does the response look organic?</li>
 * </ul>
 */
@Component
public class ChallengeValidationEngine {

    // ── Supported challenge types ──
    private static final String CHALLENGE_BLINK = "BLINK";
    private static final String CHALLENGE_HEAD_TURN = "HEAD_TURN";

    // ── Event types (from frontend) ──
    private static final String EVENT_BLINK = "BLINK";
    private static final String EVENT_HEAD_MOVEMENT = "HEAD_MOVEMENT";

    // ── Timing thresholds (milliseconds) ──
    private static final long MIN_REACTION_MS = 300;       // below → suspicious (replay)
    private static final long OPTIMAL_MIN_MS = 500;        // start of optimal window
    private static final long OPTIMAL_MAX_MS = 3000;       // end of optimal window
    private static final long MAX_ALLOWED_MS = 5000;       // above → failed

    // ── Head turn threshold ──
    private static final double HEAD_TURN_ANGLE_THRESHOLD = 10.0; // degrees

    // ── Scoring weights ──
    private static final double WEIGHT_CORRECTNESS = 0.50;
    private static final double WEIGHT_TIMING = 0.30;
    private static final double WEIGHT_NATURALNESS = 0.20;

    // ── Validity threshold ──
    private static final double VALID_THRESHOLD = 0.5;

    /**
     * Evaluates a challenge execution and produces a scored result.
     *
     * @param input the challenge data (may be null)
     * @return ChallengeResult with score, validity, and optional fail reason
     */
    public ChallengeResult evaluate(ChallengeInput input) {
        ChallengeResult result = new ChallengeResult();

        // ── Guard: null input ──
        if (input == null) {
            return fail(result, "NO_INPUT");
        }

        // ── Guard: invalid challenge type ──
        String type = input.getChallengeType();
        if (type == null || (!CHALLENGE_BLINK.equals(type) && !CHALLENGE_HEAD_TURN.equals(type))) {
            return fail(result, "INVALID_CHALLENGE_TYPE");
        }

        // ── Guard: no events ──
        if (input.getEvents() == null || input.getEvents().isEmpty()) {
            return fail(result, "NO_EVENTS");
        }

        // ── Guard: invalid timestamps ──
        if (input.getIssuedAt() <= 0 || input.getCompletedAt() <= 0) {
            return fail(result, "MISSING_TIMESTAMPS");
        }

        if (input.getCompletedAt() <= input.getIssuedAt()) {
            return fail(result, "INVALID_TIMESTAMPS");
        }

        // ── Compute sub-scores ──
        double correctnessScore = computeCorrectnessScore(input);
        double timingScore = computeTimingScore(input);
        double naturalnessScore = computeNaturalnessScore(input);

        // ── Strict fail: wrong action → immediate FAIL ──
        if (correctnessScore == 0.0) {
            return fail(result, "WRONG_ACTION");
        }

        // ── Strict fail: invalid timing → immediate FAIL ──
        if (timingScore == 0.0) {
            long reactionTime = input.getCompletedAt() - input.getIssuedAt();
            return fail(result, reactionTime < MIN_REACTION_MS ? "INSTANT_RESPONSE" : "TIMEOUT");
        }

        // ── Weighted combination ──
        double challengeScore = (correctnessScore * WEIGHT_CORRECTNESS)
                + (timingScore * WEIGHT_TIMING)
                + (naturalnessScore * WEIGHT_NATURALNESS);

        challengeScore = roundTo2(challengeScore);

        result.setChallengeScore(challengeScore);
        result.setValid(challengeScore >= VALID_THRESHOLD);

        if (!result.isValid()) {
            result.setFailReason("LOW_SCORE");
        }

        return result;
    }

    // ═══════════════════════════════════════════════
    //  CORRECTNESS SCORING
    // ═══════════════════════════════════════════════

    /**
     * Checks whether the correct action was performed for the challenge type.
     *
     * <pre>
     * BLINK challenge      → at least one BLINK event required
     * HEAD_TURN challenge   → at least one HEAD_MOVEMENT event with |angle| > 10°
     * </pre>
     */
    private double computeCorrectnessScore(ChallengeInput input) {
        String challengeType = input.getChallengeType();
        List<ChallengeEvent> events = input.getEvents();

        if (CHALLENGE_BLINK.equals(challengeType)) {
            // Need at least one BLINK event
            for (ChallengeEvent event : events) {
                if (EVENT_BLINK.equals(event.getType())) {
                    return 1.0;
                }
            }
            return 0.0; // No matching blink event found

        } else if (CHALLENGE_HEAD_TURN.equals(challengeType)) {
            // Need at least one HEAD_MOVEMENT with angle > threshold
            for (ChallengeEvent event : events) {
                if (EVENT_HEAD_MOVEMENT.equals(event.getType())
                        && Math.abs(event.getValue()) > HEAD_TURN_ANGLE_THRESHOLD) {
                    return 1.0;
                }
            }
            return 0.0; // No qualifying head turn found
        }

        return 0.0;
    }

    // ═══════════════════════════════════════════════
    //  TIMING SCORING
    // ═══════════════════════════════════════════════

    /**
     * Scores the reaction time between challenge issuance and completion.
     *
     * <pre>
     * < 300ms   → 0.0 (instant — replay attack)
     * 300–500ms → 0.5 (borderline fast)
     * 500–3000ms → 1.0 (optimal human range)
     * 3000–5000ms → 0.5 (slow)
     * > 5000ms  → 0.0 (failed / timed out)
     * </pre>
     */
    private double computeTimingScore(ChallengeInput input) {
        long reactionTime = input.getCompletedAt() - input.getIssuedAt();

        if (reactionTime < MIN_REACTION_MS) {
            return 0.0; // Suspiciously instant
        } else if (reactionTime < OPTIMAL_MIN_MS) {
            // Linear ramp 300→500ms → 0.5→1.0
            return 0.5 + 0.5 * (reactionTime - MIN_REACTION_MS)
                    / (double) (OPTIMAL_MIN_MS - MIN_REACTION_MS);
        } else if (reactionTime <= OPTIMAL_MAX_MS) {
            return 1.0; // Optimal
        } else if (reactionTime <= MAX_ALLOWED_MS) {
            // Linear decay 3000→5000ms → 1.0→0.5
            return 0.5 + 0.5 * (MAX_ALLOWED_MS - reactionTime)
                    / (double) (MAX_ALLOWED_MS - OPTIMAL_MAX_MS);
        } else {
            return 0.0; // Timed out
        }
    }

    // ═══════════════════════════════════════════════
    //  NATURALNESS SCORING
    // ═══════════════════════════════════════════════

    /**
     * Evaluates whether the event pattern looks organic vs. replayed/spammed.
     *
     * <p>Checks for:
     * <ul>
     *   <li>Duplicate events (same timestamp + same value = spam)</li>
     *   <li>Single-event responses (acceptable but not ideal)</li>
     *   <li>Multiple diverse events (most natural)</li>
     * </ul>
     *
     * <pre>
     * All events identical     → 0.3 (spam detected)
     * Single event             → 0.7 (neutral — acceptable)
     * Multiple diverse events  → 1.0 (natural)
     * </pre>
     */
    private double computeNaturalnessScore(ChallengeInput input) {
        List<ChallengeEvent> events = input.getEvents();
        int totalEvents = events.size();

        if (totalEvents == 1) {
            return 0.7; // Single response — acceptable but not ideal
        }

        // Detect duplicate events (same timestamp + type + value)
        Set<String> uniqueFingerprints = new HashSet<>();
        for (ChallengeEvent event : events) {
            String fingerprint = event.getTimestamp() + "|" + event.getType() + "|" + event.getValue();
            uniqueFingerprints.add(fingerprint);
        }

        double uniqueRatio = (double) uniqueFingerprints.size() / totalEvents;

        if (uniqueRatio < 0.5) {
            return 0.3; // More than half are duplicates → spam
        } else if (uniqueRatio < 0.8) {
            // Linear: 0.5→0.8 ratio maps to 0.5→0.8 score
            return 0.5 + (uniqueRatio - 0.5) / 0.3 * 0.3;
        } else {
            return 1.0; // Diverse, natural events
        }
    }

    // ═══════════════════════════════════════════════
    //  UTILITY
    // ═══════════════════════════════════════════════

    private ChallengeResult fail(ChallengeResult result, String reason) {
        result.setChallengeScore(0.0);
        result.setValid(false);
        result.setFailReason(reason);
        return result;
    }

    private double roundTo2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
