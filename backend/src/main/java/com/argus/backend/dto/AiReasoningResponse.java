package com.argus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReasoningResponse {
    private double aiLivenessScore; // 0.0 to 1.0
    private String confidence;       // LOW, MEDIUM, HIGH
    private String forensicReasoning; // 1-sentence explanation
}
