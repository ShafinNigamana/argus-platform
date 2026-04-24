package com.argus.backend.engine;

import com.argus.backend.model.LivenessInput;
import com.argus.backend.model.LivenessResult;
import org.springframework.stereotype.Component;

/**
 * Deterministic, stateless scoring engine that converts multi-signal liveness data
 * into a final liveness verdict (PASS / FAIL / UNCERTAIN).
 *
 * <p>Scoring weights (when all signals are present):
 * <ul>
 *   <li>signalQuality → 40%</li>
 *   <li>behaviorScore → 30%</li>
 *   <li>challengeScore → 30%</li>
 * </ul>
 *
 * <p>When optional signals (behaviorScore, challengeScore) are missing,
 * their weight is redistributed proportionally to the remaining signals.
 */
@Component
public class LivenessDecisionEngine {

    // --- Weight constants ---
    private static final double WEIGHT_SIGNAL_QUALITY = 0.40;
    private static final double WEIGHT_BEHAVIOR = 0.30;
    private static final double WEIGHT_CHALLENGE = 0.30;

    // --- Threshold constants ---
    private static final double THRESHOLD_PASS = 65.0;
    private static final double THRESHOLD_UNCERTAIN = 40.0;

    // --- Guard rail constants ---
    private static final double MIN_SIGNAL_QUALITY = 0.3;
    private static final double MIN_BPM = 40.0;     // relaxed from 50.0 to match Processing Engine
    private static final double MAX_BPM = 180.0;    // relaxed from 120.0 to match Processing Engine

    /**
     * Evaluates all available liveness signals and produces a final verdict.
     *
     * @param input the aggregated liveness input (may be null)
     * @return a LivenessResult with score, status, and fail reason if applicable
     */
    public LivenessResult evaluate(LivenessInput input) {
        LivenessResult result = new LivenessResult();

        // ── Guard Rail 1: Null input ──
        if (input == null) {
            return buildFailResult(result, null, null, null, null, "NO_INPUT");
        }

        // Populate echo fields
        result.setBpm(input.getBpm());
        result.setSignalQuality(input.getSignalQuality());
        result.setBehaviorScore(input.getBehaviorScore());
        result.setChallengeScore(input.getChallengeScore());

        // ── Guard Rail 2: All inputs null → no data received at all ──
        if (input.getBpm() == null && input.getSignalQuality() == null
                && input.getBehaviorScore() == null && input.getChallengeScore() == null) {
            return buildFailResult(result, "NO_DATA");
        }

        // ── Guard Rail 2: No BPM data ──
        if (input.getBpm() == null) {
            return buildFailResult(result, "NO_BPM_DATA");
        }

        // ── Guard Rail 3: BPM out of physiological range ──
        if (input.getBpm() < MIN_BPM || input.getBpm() > MAX_BPM) {
            return buildFailResult(result, "INVALID_BPM");
        }

        // ── Guard Rail 4: Signal quality too low or missing ──
        if (input.getSignalQuality() == null || input.getSignalQuality() < MIN_SIGNAL_QUALITY) {
            return buildFailResult(result, "LOW_SIGNAL_QUALITY");
        }

        // ── Adaptive Weight Redistribution ──
        double totalWeight = WEIGHT_SIGNAL_QUALITY;
        double weightedSum = input.getSignalQuality() * WEIGHT_SIGNAL_QUALITY;

        if (input.getBehaviorScore() != null) {
            totalWeight += WEIGHT_BEHAVIOR;
            weightedSum += input.getBehaviorScore() * WEIGHT_BEHAVIOR;
        }

        if (input.getChallengeScore() != null) {
            totalWeight += WEIGHT_CHALLENGE;
            weightedSum += input.getChallengeScore() * WEIGHT_CHALLENGE;
        }

        // Normalize to 0–100 scale
        double livenessScore = (weightedSum / totalWeight) * 100.0;
        livenessScore = Math.max(0.0, Math.min(100.0, livenessScore));

        // Round to one decimal place for clean output
        livenessScore = Math.round(livenessScore * 10.0) / 10.0;

        result.setLivenessScore(livenessScore);

        // ── Status Determination ──
        if (livenessScore >= THRESHOLD_PASS) {
            result.setStatus("PASS");
        } else if (livenessScore >= THRESHOLD_UNCERTAIN) {
            result.setStatus("UNCERTAIN");
        } else {
            result.setStatus("FAIL");
        }

        return result;
    }

    /**
     * Builds a FAIL result with pre-populated echo fields and a specific reason.
     */
    private LivenessResult buildFailResult(LivenessResult result, String reason) {
        result.setLivenessScore(0.0);
        result.setStatus("FAIL");
        result.setFailReason(reason);
        return result;
    }

    /**
     * Builds a FAIL result for null input where no fields are available.
     */
    private LivenessResult buildFailResult(LivenessResult result,
                                            Double bpm, Double signalQuality,
                                            Double behaviorScore, Double challengeScore,
                                            String reason) {
        result.setBpm(bpm);
        result.setSignalQuality(signalQuality);
        result.setBehaviorScore(behaviorScore);
        result.setChallengeScore(challengeScore);
        result.setLivenessScore(0.0);
        result.setStatus("FAIL");
        result.setFailReason(reason);
        return result;
    }
}
