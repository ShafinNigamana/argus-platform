package com.argus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AntiSpoofResponse {
    private boolean isReal;
    private double livenessScore;      // 0.0 to 1.0 (probability of real human)
    private double spoofScore;        // 0.0 to 1.0 (probability of presentation attack)
    private String classification;    // REAL, SPOOF_PRINT, SPOOF_REPLAY
    private String confidence;        // HIGH, MEDIUM, LOW
    private String reasoning;         // Forensic explanation
    private long inferenceTimeMs;     // Hardware execution duration
}
