package com.argus.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Request body for POST /api/v1/admin/policies.
 * TDD §4.1.
 */
@Data
public class PolicyRequest {

    @NotBlank(message = "Policy name is required")
    @Size(max = 150)
    private String name;

    private String organisation;

    @Min(value = 0, message = "Confidence threshold must be 0–100")
    @Max(value = 100, message = "Confidence threshold must be 0–100")
    private double confidenceThreshold = 80.0;

    private List<String> challengeTypes;

    @Min(30)
    @Max(300)
    private int maxDurationSeconds = 90;

    private boolean active = true;
}
