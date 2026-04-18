package com.argus.backend.model;

import lombok.Data;
import java.util.List;

/**
 * Internal input model for the Behavior Validation Engine.
 * Aggregates all raw behavioral signals for analysis.
 */
@Data
public class BehaviorInput {

    /** List of detected blink events during the session. */
    private List<BlinkEvent> blinkEvents;

    /** List of head movement samples during the session. */
    private List<HeadMovement> headMovements;

    /** Total session duration in milliseconds. */
    private long sessionDuration;
}
