package com.argus.backend.dto;

import lombok.Data;

/**
 * Data Transfer Object for responding to an ingested frame.
 */
@Data
public class FrameResponse {
    private boolean accepted;
    private String qualityStatus; // Expected: "GOOD", "LOW_QUALITY", "REJECTED"
}
