package com.argus.backend.model;

import lombok.Data;

/**
 * Represents a single detected blink event from the frontend.
 */
@Data
public class BlinkEvent {
    /** Epoch timestamp in milliseconds when the blink was detected. */
    private long timestamp;

    /** Duration of the blink in milliseconds. */
    private int duration;
}
