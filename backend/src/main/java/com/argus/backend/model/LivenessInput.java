package com.argus.backend.model;

import lombok.Data;

/**
 * Aggregated input model for the Liveness Decision Engine.
 * Collects all scoring signals needed to compute a final liveness verdict.
 * All fields are nullable Doubles to distinguish "not yet available" from "zero".
 */
@Data
public class LivenessInput {

    /** Heart rate in beats per minute, derived from FFT processing. */
    private Double bpm;

    /** Signal quality metric from FFT (0.0–1.0). */
    private Double signalQuality;

    /** Behavioral analysis score — blink detection, head movement (0.0–1.0). */
    private Double behaviorScore;

    /** Challenge execution score — response to active prompts (0.0–1.0). */
    private Double challengeScore;

    public LivenessInput() {
    }

    public LivenessInput(Double bpm, Double signalQuality, Double behaviorScore, Double challengeScore) {
        this.bpm = bpm;
        this.signalQuality = signalQuality;
        this.behaviorScore = behaviorScore;
        this.challengeScore = challengeScore;
    }

    /**
     * Factory method to construct a LivenessInput from an existing ProcessingResult.
     * BehaviorScore and ChallengeScore are left null (not yet available).
     *
     * @param result the signal processing result (may be null)
     * @return a LivenessInput populated with available signal data
     */
    public static LivenessInput fromProcessingResult(ProcessingResult result) {
        if (result == null) {
            return new LivenessInput();
        }
        LivenessInput input = new LivenessInput();
        input.setBpm(result.getBpm());
        input.setSignalQuality(result.getSignalQuality());
        return input;
    }
}
