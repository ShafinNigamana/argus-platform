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
    void testPrintModelMetadata() throws Exception {
        // We will call evaluate to inspect or print input info
        java.lang.reflect.Field sessionField = OnnxLivenessService.class.getDeclaredField("session");
        sessionField.setAccessible(true);
        ai.onnxruntime.OrtSession session = (ai.onnxruntime.OrtSession) sessionField.get(onnxLivenessService);
        System.out.println("=== ONNX MODEL INPUT INFO ===");
        session.getInputInfo().forEach((k, v) -> System.out.println("Input: " + k + " -> " + v.getInfo()));
        System.out.println("=== ONNX MODEL OUTPUT INFO ===");
        session.getOutputInfo().forEach((k, v) -> System.out.println("Output: " + k + " -> " + v.getInfo()));
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
    void testSampleImagesRealAndFake() throws Exception {
        java.io.File realFile = new java.io.File("src/test/resources/image_T1.jpg");
        java.io.File fakeFile1 = new java.io.File("src/test/resources/image_F1.jpg");
        java.io.File fakeFile2 = new java.io.File("src/test/resources/image_F2.jpg");

        Map<String, java.io.File> testFiles = Map.of(
                "REAL (image_T1)", realFile,
                "FAKE 1 (image_F1)", fakeFile1,
                "FAKE 2 (image_F2)", fakeFile2
        );

        java.lang.reflect.Field sessionField = OnnxLivenessService.class.getDeclaredField("session");
        sessionField.setAccessible(true);
        ai.onnxruntime.OrtSession session = (ai.onnxruntime.OrtSession) sessionField.get(onnxLivenessService);
        java.lang.reflect.Field envField = OnnxLivenessService.class.getDeclaredField("env");
        envField.setAccessible(true);
        ai.onnxruntime.OrtEnvironment env = (ai.onnxruntime.OrtEnvironment) envField.get(onnxLivenessService);

        for (Map.Entry<String, java.io.File> entry : testFiles.entrySet()) {
            if (!entry.getValue().exists()) continue;

            BufferedImage img = ImageIO.read(entry.getValue());
            System.out.println("\n=== TESTING " + entry.getKey() + " (" + img.getWidth() + "x" + img.getHeight() + ") ===");

            // Evaluate with evaluateFaceImage (current pipeline)
            byte[] rawBytes = java.nio.file.Files.readAllBytes(entry.getValue().toPath());
            AntiSpoofResponse resp = onnxLivenessService.evaluateFaceImage(rawBytes);
            System.out.println("evaluateFaceImage Result: " + resp.getClassification() + 
                    ", Liveness=" + resp.getLivenessScore() + 
                    ", Spoof=" + resp.getSpoofScore() + 
                    ", Reasoning=" + resp.getReasoning());

            if (entry.getKey().startsWith("REAL")) {
                assertTrue(resp.isReal(), "Real human image must be classified as REAL");
                assertTrue(resp.getLivenessScore() >= 0.85, "Real human image liveness score must be >= 0.85");
            } else {
                assertFalse(resp.isReal(), "Spoof image must NOT be classified as REAL");
                assertTrue(resp.getSpoofScore() >= 0.85, "Spoof image spoof score must be >= 0.85");
            }

            // Also test raw ONNX outputs for BGR vs RGB, with [0..1] and [0..255]
            for (boolean isRgb : new boolean[]{false, true}) {
                for (boolean scale255 : new boolean[]{true, false}) {
                    BufferedImage resized = new BufferedImage(80, 80, BufferedImage.TYPE_3BYTE_BGR);
                    Graphics2D g = resized.createGraphics();
                    g.drawImage(img, 0, 0, 80, 80, null);
                    g.dispose();

                    float[] nhwc = new float[80 * 80 * 3];
                    for (int y = 0; y < 80; y++) {
                        for (int x = 0; x < 80; x++) {
                            int rgbVal = resized.getRGB(x, y);
                            int r = (rgbVal >> 16) & 0xFF;
                            int gr = (rgbVal >> 8) & 0xFF;
                            int b = rgbVal & 0xFF;
                            int offset = (y * 80 + x) * 3;
                            float div = scale255 ? 255.0f : 1.0f;
                            if (isRgb) {
                                nhwc[offset + 0] = r / div;
                                nhwc[offset + 1] = gr / div;
                                nhwc[offset + 2] = b / div;
                            } else {
                                nhwc[offset + 0] = b / div;
                                nhwc[offset + 1] = gr / div;
                                nhwc[offset + 2] = r / div;
                            }
                        }
                    }

                    long[] shape = new long[]{1, 80, 80, 3};
                    try (ai.onnxruntime.OnnxTensor tensor = ai.onnxruntime.OnnxTensor.createTensor(env, java.nio.FloatBuffer.wrap(nhwc), shape);
                         ai.onnxruntime.OrtSession.Result res = session.run(java.util.Collections.singletonMap("input", tensor))) {
                        float[][] out = (float[][]) res.get(0).getValue();
                        System.out.println(String.format("  Format: %-3s, Range: %-7s -> Output: [c0=%.4f, c1=%.4f, c2=%.4f]",
                                isRgb ? "RGB" : "BGR", scale255 ? "[0..1]" : "[0..255]", out[0][0], out[0][1], out[0][2]));
                    }
                }
            }
        }
    }
}
