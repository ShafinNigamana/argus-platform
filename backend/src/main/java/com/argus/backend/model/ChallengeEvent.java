package com.argus.backend.model;

import lombok.Data;

/**
 * Represents a single event captured during a challenge execution.
 * Sent by the frontend when the user responds to a challenge prompt.
 */
@Data
public class ChallengeEvent {
    /** Epoch timestamp in milliseconds when the event was captured. */
    private long timestamp;

    /** Event type: "BLINK" or "HEAD_MOVEMENT". */
    private String type;

    /** Associated value — blink duration (ms) for BLINK, angle (degrees) for HEAD_MOVEMENT. */
    private double value;
}
