package com.argus.backend.model;

import lombok.Data;

/**
 * Output of the Behavior Validation Engine.
 * Contains individual sub-scores and the final weighted behavior score.
 */
@Data
public class BehaviorResult {

    /** Blink naturalness score (0.0–1.0). */
    private double blinkScore;

    /** Head movement naturalness score (0.0–1.0). */
    private double movementScore;

    /** Final weighted behavior score (0.0–1.0). */
    private double behaviorScore;
}
