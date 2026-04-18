package com.argus.backend.model;

import lombok.Data;

/**
 * Output model from the Liveness Decision Engine.
 * Contains the final score, status verdict, and all input signal echoes
 * for full transparency and debugging.
 */
@Data
public class LivenessResult {
    /** Final computed liveness score (0–100). */
    private double livenessScore;

    /** Verdict: "PASS", "FAIL", or "UNCERTAIN". */
    private String status;

    /** Echo of input BPM (null if not available). */
    private Double bpm;

    /** Echo of input signal quality (null if not available). */
    private Double signalQuality;

    /** Echo of input behavior score (null if not available). */
    private Double behaviorScore;

    /** Echo of input challenge score (null if not available). */
    private Double challengeScore;

    /** Reason for FAIL, null if status is not FAIL due to guard rails. */
    private String failReason;
}
