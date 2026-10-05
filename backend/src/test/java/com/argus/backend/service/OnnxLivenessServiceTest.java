package com.argus.backend.service;

import com.argus.backend.dto.AiReasoningResponse;
import com.argus.backend.dto.AntiSpoofResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class OnnxLivenessServiceTest {

    private OnnxLivenessService onnxLivenessService;

    @BeforeEach
    void setUp() {
        onnxLivenessService = new OnnxLivenessService(new DefaultResourceLoader());
        onnxLivenessService.init();
    }

    @Test
    void testModelLoadsSuccessfully() {
        assertTrue(onnxLivenessService.isModelReady(), "MiniFASNetV2-SE ONNX model should initialize and be ready");
    }

    @Test
    void testTelemetryEvaluationZeroApi() {
        Map<String, Object> telemetry = Map.of(
                "bpm", 72.0,
                "signalQuality", 0.85,
                "behaviorScore", 0.80,
                "challengeScore", 0.90,
                "blinkCount", 4
        );

        AiReasoningResponse response = onnxLivenessService.evaluateTelemetry(telemetry);
        assertNotNull(response);
        assertTrue(response.getAiLivenessScore() >= 0.80, "Real biometric rhythm should score >= 0.80");
        assertEquals("HIGH", response.getConfidence());
        assertTrue(response.getForensicReasoning().contains("BPM"));
    }

    @Test
    void testTelemetryEvaluationBotPattern() {
        Map<String, Object> telemetry = Map.of(
                "bpm", 0.0,
                "signalQuality", 0.1,
                "behaviorScore", 0.2,
                "challengeScore", 0.1,
                "blinkCount", 0
        );

        AiReasoningResponse response = onnxLivenessService.evaluateTelemetry(telemetry);
        assertNotNull(response);
        assertTrue(response.getAiLivenessScore() <= 0.40, "Robotic/absent rhythm should score <= 0.40");
    }

    @Test
    void testEvaluateSyntheticFaceImageInference() throws Exception {
        // Create an 80x80 test image
        BufferedImage testImage = new BufferedImage(80, 80, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D g = testImage.createGraphics();
        g.setColor(new Color(210, 160, 140)); // Skin-like tone
        g.fillRect(0, 0, 80, 80);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(testImage, "jpg", baos);
        byte[] imageBytes = baos.toByteArray();

        AntiSpoofResponse response = onnxLivenessService.evaluateFaceImage(imageBytes);
        assertNotNull(response);
        assertNotNull(response.getClassification());
        assertTrue(response.getLivenessScore() >= 0.0 && response.getLivenessScore() <= 1.0);
        assertTrue(response.getInferenceTimeMs() >= 0);
        System.out.println("ONNX Test Classification: " + response.getClassification() +
                ", Liveness: " + response.getLivenessScore() +
                ", Inference Time: " + response.getInferenceTimeMs() + "ms");
    }
}
