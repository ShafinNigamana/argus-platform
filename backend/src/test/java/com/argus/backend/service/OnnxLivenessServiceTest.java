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

        java.io.File ufFile = new java.io.File("src/main/resources/models/ultraface_slim_320.onnx");
        if (ufFile.exists()) {
            java.lang.reflect.Field envField = OnnxLivenessService.class.getDeclaredField("env");
            envField.setAccessible(true);
            ai.onnxruntime.OrtEnvironment env = (ai.onnxruntime.OrtEnvironment) envField.get(onnxLivenessService);
            try (ai.onnxruntime.OrtSession ufSession = env.createSession(ufFile.getAbsolutePath())) {
                System.out.println("=== ULTRAFACE INPUT INFO ===");
                ufSession.getInputInfo().forEach((k, v) -> System.out.println("UF Input: " + k + " -> " + v.getInfo()));
                System.out.println("=== ULTRAFACE OUTPUT INFO ===");
                ufSession.getOutputInfo().forEach((k, v) -> System.out.println("UF Output: " + k + " -> " + v.getInfo()));

                for (Map.Entry<String, java.io.File> entry : Map.of(
                        "image_T1 (Real Face)", new java.io.File("src/test/resources/image_T1.jpg"),
                        "test-6 (Man's Back)", new java.io.File("D:/SGP/Argus/test-6.jpg"),
                        "image_F1 (Fake Face)", new java.io.File("src/test/resources/image_F1.jpg")
                ).entrySet()) {
                    if (!entry.getValue().exists()) continue;
                    BufferedImage img = ImageIO.read(entry.getValue());
                    BufferedImage resized = new BufferedImage(320, 240, BufferedImage.TYPE_INT_RGB);
                    Graphics2D g = resized.createGraphics();
                    g.drawImage(img, 0, 0, 320, 240, null);
                    g.dispose();

                    float[] nchw = new float[1 * 3 * 240 * 320];
                    for (int y = 0; y < 240; y++) {
                        for (int x = 0; x < 320; x++) {
                            int rgb = resized.getRGB(x, y);
                            float r = (((rgb >> 16) & 0xFF) - 127.0f) / 128.0f;
                            float gr = (((rgb >> 8) & 0xFF) - 127.0f) / 128.0f;
                            float b = ((rgb & 0xFF) - 127.0f) / 128.0f;

                            nchw[0 * 240 * 320 + y * 320 + x] = r;
                            nchw[1 * 240 * 320 + y * 320 + x] = gr;
                            nchw[2 * 240 * 320 + y * 320 + x] = b;
                        }
                    }

                    long[] shape = new long[]{1, 3, 240, 320};
                    try (ai.onnxruntime.OnnxTensor tensor = ai.onnxruntime.OnnxTensor.createTensor(env, java.nio.FloatBuffer.wrap(nchw), shape);
                         ai.onnxruntime.OrtSession.Result res = ufSession.run(java.util.Collections.singletonMap("input", tensor))) {
                        float[][][] scores = (float[][][]) res.get("scores").get().getValue();
                        float maxFaceScore = 0.0f;
                        for (int i = 0; i < 4420; i++) {
                            if (scores[0][i][1] > maxFaceScore) {
                                maxFaceScore = scores[0][i][1];
                            }
                        }
                        System.out.println(String.format("ULTRAFACE RESULT [%-22s]: Max Face Confidence = %.4f (%.1f%%)",
                                entry.getKey(), maxFaceScore, maxFaceScore * 100.0));
                    }
                }
            }
        }
    }

    @Test
    void testTiltedFaces() throws Exception {
        java.io.File realFile = new java.io.File("src/test/resources/image_T1.jpg");
        if (!realFile.exists()) return;
        BufferedImage baseImg = ImageIO.read(realFile);

        int[] angles = new int[]{-35, -25, -15, 0, 15, 25, 35};
        for (int angle : angles) {
            int w = baseImg.getWidth();
            int h = baseImg.getHeight();
            BufferedImage rotated = new BufferedImage(w, h, BufferedImage.TYPE_3BYTE_BGR);
            Graphics2D g = rotated.createGraphics();
            g.setColor(new Color(240, 240, 240));
            g.fillRect(0, 0, w, h);
            g.rotate(Math.toRadians(angle), w / 2.0, h / 2.0);
            g.drawImage(baseImg, 0, 0, null);
            g.dispose();

            OnnxLivenessService.FaceDetectionResult resFull = onnxLivenessService.detectFace(rotated);

            // Simulate browser canvas resizing to 320x320
            BufferedImage simBrowser320 = new BufferedImage(320, 320, BufferedImage.TYPE_3BYTE_BGR);
            Graphics2D gSim = simBrowser320.createGraphics();
            gSim.drawImage(rotated, 0, 0, 320, 320, null);
            gSim.dispose();
            ByteArrayOutputStream simBaos = new ByteArrayOutputStream();
            ImageIO.write(simBrowser320, "jpg", simBaos);
            BufferedImage simDecoded = ImageIO.read(new java.io.ByteArrayInputStream(simBaos.toByteArray()));
            OnnxLivenessService.FaceDetectionResult resSim320 = onnxLivenessService.detectFace(simDecoded);
            AntiSpoofResponse evalSim320 = onnxLivenessService.evaluateFaceImage(simBaos.toByteArray());

            assertTrue(resSim320.faceDetected(), "Face must be detected by UltraFace at angle " + angle);
            assertTrue(resSim320.confidence() >= 0.45f, "UltraFace confidence must be >= 0.45 at angle " + angle);
            assertNotEquals("NO_FACE", evalSim320.getClassification(), "Verdict must never be NO_FACE for real human face at angle " + angle);
        }
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

    @Test
    void testWallImageRejection() throws Exception {
        // 1. Plain white wall
        BufferedImage whiteWall = new BufferedImage(320, 240, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D g = whiteWall.createGraphics();
        g.setColor(new Color(245, 242, 238));
        g.fillRect(0, 0, 320, 240);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(whiteWall, "jpg", baos);
        AntiSpoofResponse resp = onnxLivenessService.evaluateFaceImage(baos.toByteArray());
        System.out.println("=== WHITE WALL CURRENT RESULT ===");
        System.out.println("Classification: " + resp.getClassification() + ", isReal=" + resp.isReal() + ", livenessScore=" + resp.getLivenessScore() + ", reasoning=" + resp.getReasoning());

        // 2. Beige / peach wall
        BufferedImage beigeWall = new BufferedImage(320, 240, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D g2 = beigeWall.createGraphics();
        g2.setColor(new Color(225, 205, 185));
        g2.fillRect(0, 0, 320, 240);
        g2.dispose();

        ByteArrayOutputStream baos2 = new ByteArrayOutputStream();
        ImageIO.write(beigeWall, "jpg", baos2);
        AntiSpoofResponse resp2 = onnxLivenessService.evaluateFaceImage(baos2.toByteArray());
        // Assertions for white wall
        assertEquals("NO_FACE", resp.getClassification(), "White wall must be classified as NO_FACE");
        assertFalse(resp.isReal(), "White wall must not be classified as real");
        assertEquals(0.0, resp.getLivenessScore(), "White wall liveness score must be 0.0");

        // Assertions for beige wall
        assertEquals("NO_FACE", resp2.getClassification(), "Beige wall must be classified as NO_FACE");
        assertFalse(resp2.isReal(), "Beige wall must not be classified as real");
        assertEquals(0.0, resp2.getLivenessScore(), "Beige wall liveness score must be 0.0");

        // 3. Dark / covered lens image
        BufferedImage darkImg = new BufferedImage(320, 240, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D g3 = darkImg.createGraphics();
        g3.setColor(new Color(5, 5, 5));
        g3.fillRect(0, 0, 320, 240);
        g3.dispose();

        ByteArrayOutputStream baos3 = new ByteArrayOutputStream();
        ImageIO.write(darkImg, "jpg", baos3);
        AntiSpoofResponse resp3 = onnxLivenessService.evaluateFaceImage(baos3.toByteArray());
        assertEquals("NO_FACE", resp3.getClassification(), "Dark frame must be classified as NO_FACE");
        assertFalse(resp3.isReal());

        // 4. Test test-6.jpg (Back of body, no face)
        java.io.File test6 = new java.io.File("D:/SGP/Argus/test-6.jpg");
        if (test6.exists()) {
            byte[] test6Bytes = java.nio.file.Files.readAllBytes(test6.toPath());
            AntiSpoofResponse resp6 = onnxLivenessService.evaluateFaceImage(test6Bytes);
            System.out.println("=== TEST-6.JPG RESULT ===");
            System.out.println("Classification: " + resp6.getClassification() + ", isReal=" + resp6.isReal() + ", livenessScore=" + resp6.getLivenessScore() + ", reasoning=" + resp6.getReasoning());
            BufferedImage img6 = ImageIO.read(test6);
            OnnxLivenessService.PreprocessedFaceData data6 = onnxLivenessService.preprocessAndValidateFace(img6);
            System.out.println(String.format("TEST-6 METRICS: hasFace=%s, skinRatio=%.3f, stdDev=%.2f, avgGrad=%.2f, reason=%s",
                    data6.check.hasFace(), data6.check.skinRatio(), data6.check.stdDev(), data6.check.avgGrad(), data6.check.reason()));
            assertEquals("NO_FACE", resp6.getClassification(), "test-6.jpg (man's back) must be classified as NO_FACE");
            assertFalse(resp6.isReal(), "test-6.jpg must not be classified as real");
            assertEquals(0.0, resp6.getLivenessScore(), "test-6.jpg liveness score must be 0.0");
        }
    }
}
