package com.argus.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AntiSpoofResponse {
    @JsonProperty("isReal")
    private boolean isReal;
    
    public boolean isReal() {
        return isReal;
    }

    @JsonProperty("real")
    public boolean getReal() {
        return isReal;
    }
    private double livenessScore;      // 0.0 to 1.0 (probability of real human)
    private double spoofScore;        // 0.0 to 1.0 (probability of presentation attack)
    private String classification;    // REAL, SPOOF_PRINT, SPOOF_REPLAY
    private String confidence;        // HIGH, MEDIUM, LOW
    private String reasoning;         // Forensic explanation
    private long inferenceTimeMs;     // Hardware execution duration

    // Interview Proctoring & Anti-Cheating Fields (>30° deviation detection)
    @JsonProperty("headPoseAngle")
    private Double headPoseAngle;      // Total/maximum head angle in degrees

    @JsonProperty("headYaw")
    private Double headYaw;            // Yaw angle in degrees (-90 to +90)

    @JsonProperty("headPitch")
    private Double headPitch;          // Pitch angle in degrees (-90 to +90)

    @JsonProperty("headRoll")
    private Double headRoll;           // Roll angle in degrees (-90 to +90)

    @JsonProperty("cheatingAlert")
    private boolean cheatingAlert;     // True if user moved/turned > 30 degrees

    public boolean isCheatingAlert() {
        return cheatingAlert;
    }

    @JsonProperty("proctorWarning")
    private String proctorWarning;     // Human-readable proctoring forensic warning

    @JsonProperty("headDirection")
    private String headDirection;      // Dominant deviation vector (e.g. TILT_RIGHT, TURNED_LEFT, LOOKING_DOWN)
}
