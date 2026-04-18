package com.argus.backend.model;

import lombok.Data;

/**
 * Represents a single head movement sample from the frontend.
 */
@Data
public class HeadMovement {
    /** Epoch timestamp in milliseconds when the movement was sampled. */
    private long timestamp;

    /** Head angle in degrees relative to neutral position. */
    private double angle;
}
