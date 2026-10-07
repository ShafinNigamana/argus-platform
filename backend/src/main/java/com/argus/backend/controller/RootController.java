package com.argus.backend.controller;

import com.argus.backend.service.GeminiForensicService;
import com.argus.backend.dto.AiReasoningResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.HashMap;

@RestController
public class RootController {

    private final GeminiForensicService geminiService;

    public RootController(GeminiForensicService geminiService) {
        this.geminiService = geminiService;
    }

    @GetMapping("/health")
    public Map<String, String> index() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Argus Backend API is running");
        response.put("version", "0.0.1-SNAPSHOT");
        return response;
    }

    @GetMapping("/api/v1")
    public Map<String, String> apiIndex() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("api_version", "v1");
        response.put("endpoints", "/session/start, /session/{id}/result, /verify/{id}, /ai-test");
        return response;
    }

    @GetMapping("/api/v1/ai-test")
    public AiReasoningResponse testAi() {
        Map<String, Object> mockTelemetry = new HashMap<>();
        mockTelemetry.put("bpm", 72.0);
        mockTelemetry.put("signalQuality", 0.95);
        mockTelemetry.put("behaviorScore", 0.88);
        mockTelemetry.put("challengeScore", 0.92);
        mockTelemetry.put("blinkCount", 5);
        
        return geminiService.analyzeLiveness(mockTelemetry);
    }
}
