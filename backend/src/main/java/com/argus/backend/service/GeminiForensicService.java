package com.argus.backend.service;

import com.argus.backend.dto.AiReasoningResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.ResponseHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.Map;

@Slf4j
@Service
public class GeminiForensicService {

    @Value("${google.cloud.project-id:argus-gsc-26}")
    private String projectId;

    @Value("${google.cloud.location:us-central1}")
    private String location;

    @Value("${gemini.enabled:true}")
    private boolean enabled;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final OnnxLivenessService onnxLivenessService;
    private GenerativeModel model;

    public GeminiForensicService(OnnxLivenessService onnxLivenessService) {
        this.onnxLivenessService = onnxLivenessService;
    }

    @PostConstruct
    public void init() {
        if (!enabled) return;
        try {
            VertexAI vertexAI = new VertexAI(projectId, location);
            // Using 2.5 Flash-Lite in us-central1
            this.model = new GenerativeModel("gemini-2.5-flash-lite", vertexAI);
            log.info("Gemini Forensic Service initialized with 2.5 Flash-Lite (us-central1).");
        } catch (Exception e) {
            log.error("Failed to initialize Gemini: {}", e.getMessage());
            this.enabled = false;
        }
    }

    public AiReasoningResponse analyzeLiveness(Map<String, Object> biometricTelemetry) {
        if (!enabled) {
            return onnxLivenessService.evaluateTelemetry(biometricTelemetry);
        }

        try {
            String inputJson = objectMapper.writeValueAsString(biometricTelemetry);
            
            String prompt = "You are an expert biometric forensic analyst. Analyze the following verification session data (telemetry) to detect if it is a real human or a bot/replay attack.\n\n" +
                    "### DATA:\n" + inputJson + "\n\n" +
                    "### INSTRUCTIONS:\n" +
                    "1. Evaluate 'Entropy' (human randomness vs robotic consistency).\n" +
                    "2. Check if reaction times are consistent with human neural latency (usually 150ms-500ms).\n" +
                    "3. Respond ONLY in strict JSON format with these exact keys: 'aiLivenessScore' (0.0 to 1.0), 'confidence' (LOW, MEDIUM, HIGH), and 'forensicReasoning' (exactly one sentence).\n\n" +
                    "### JSON RESPONSE:";

            GenerateContentResponse response = model.generateContent(prompt);
            String text = ResponseHandler.getText(response);
            
            // Clean up Markdown formatting if present
            String jsonPart = text.replaceAll("(?s).*?\\{", "{").replaceAll("\\}.*?\\z", "}");
            
            return objectMapper.readValue(jsonPart, AiReasoningResponse.class);

        } catch (Exception e) {
            log.warn("Gemini analysis failed: {}; smoothly falling back to local ML model.", e.getMessage());
            return onnxLivenessService.evaluateTelemetry(biometricTelemetry);
        }
    }
}
