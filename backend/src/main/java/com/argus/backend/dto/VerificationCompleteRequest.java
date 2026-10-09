package com.argus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request payload for POST /api/v1/verify/{verificationId}/complete.
 * Aggregates client-side biometric observations (rPPG, behavioral dynamics, challenge outcome)
 * for backend authoritative verification evaluation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationCompleteRequest {
    private Double signalQuality;
    private Double averageBpm;
    private Boolean challengePassed;
    private Double blinkDynamicsScore;
    private Double behaviorScore;
    private String image; // Optional Base64 JPEG/PNG for anti-spoof evaluation
    private Map<String, Object> telemetry;
}
