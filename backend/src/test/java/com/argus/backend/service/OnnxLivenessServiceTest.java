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
                        int highConfCount = 0;
                        float[][][] boxes = (float[][][]) res.get("boxes").get().getValue();
                        for (int i = 0; i < 4420; i++) {
                            if (scores[0][i][1] > maxFaceScore) {
                                maxFaceScore = scores[0][i][1];
                            }
                            if (scores[0][i][1] >= 0.45f) {
                                highConfCount++;
                                if (highConfCount <= 5) {
                                    float[] b = boxes[0][i];
                                    System.out.println(String.format("  Anchor #%d: prob=%.4f, box=[%.4f, %.4f, %.4f, %.4f]",
                                            i, scores[0][i][1], b[0], b[1], b[2], b[3]));
                                }
                            }
                        }
                        System.out.println(String.format("ULTRAFACE RESULT [%-22s]: Max Face Confidence = %.4f (%.1f%%), Anchors >= 0.45: %d",
                                entry.getKey(), maxFaceScore, maxFaceScore * 100.0, highConfCount));
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
    void testMultipleFacesRejected() throws Exception {
        java.io.File realFile = new java.io.File("src/test/resources/image_T1.jpg");
        if (!realFile.exists()) return;
        BufferedImage singleFace = ImageIO.read(realFile);

        OnnxLivenessService.FaceDetectionResult resSingle = onnxLivenessService.detectFace(singleFace);
        System.out.println(String.format("SINGLE-FACE ON T1: detected=%s, count=%d, conf=%.4f, box=%s",
                resSingle.faceDetected(), resSingle.faceCount(), resSingle.confidence(),
                resSingle.bestBox() != null ? java.util.Arrays.toString(resSingle.bestBox()) : "null"));

        // Construct a realistic two-person scene:
        // Left half: person 1 from image_T1 (face naturally positioned on left at x ~ 0.25)
        // Right half: person 2 from image_F1 horizontally flipped (face naturally positioned on right at x ~ 0.75)
        BufferedImage person2 = ImageIO.read(new java.io.File("src/test/resources/image_F1.jpg"));
        BufferedImage twoFaces = new BufferedImage(640, 480, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D g = twoFaces.createGraphics();
        // Left half of canvas gets left half of image_T1
        g.drawImage(singleFace, 0, 0, 320, 480, 0, 0, 320, 480, null);
        // Right half of canvas gets flipped image_F1 (so face is on the right half)
        g.drawImage(person2, 320, 0, 640, 480, 0, 0, 320, 480, null);
        g.dispose();

        OnnxLivenessService.FaceDetectionResult detectRes = onnxLivenessService.detectFace(twoFaces);
        System.out.println(String.format("MULTI-FACE DETECTION: count=%d, conf=%.4f",
                detectRes.faceCount(), detectRes.confidence()));
        for (int i = 0; i < detectRes.allFaceBoxes().size(); i++) {
            System.out.println("  Face #" + i + " box: " + java.util.Arrays.toString(detectRes.allFaceBoxes().get(i)));
        }
        assertEquals(2, detectRes.faceCount(), "UltraFace NMS must detect exactly 2 distinct faces");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(twoFaces, "jpg", baos);
        AntiSpoofResponse eval = onnxLivenessService.evaluateFaceImage(baos.toByteArray());

        System.out.println(String.format("MULTI-FACE VERDICT: class=%s, isReal=%s, reason=%s",
                eval.getClassification(), eval.isReal(), eval.getReasoning()));
        assertEquals("MULTIPLE_FACES", eval.getClassification(), "Multiple faces must yield MULTIPLE_FACES verdict");
        assertFalse(eval.isReal(), "Multiple faces must not be classified as real");
        assertEquals(0.0, eval.getLivenessScore(), "Multiple faces must have liveness score 0.0");
        assertTrue(eval.getReasoning().contains("Multiple faces detected"));
    }

    @Test
    void testFullFrameSingleFaceDetected() throws Exception {
        java.io.File realFile = new java.io.File("src/test/resources/image_T1.jpg");
        if (!realFile.exists()) return;
        BufferedImage singleFace = ImageIO.read(realFile);

        // 1. Native 640x480 full frame
        OnnxLivenessService.FaceDetectionResult detectRes = onnxLivenessService.detectFace(singleFace);
        System.out.println(String.format("FULL-FRAME DETECTION: detected=%s, count=%d, conf=%.4f",
                detectRes.faceDetected(), detectRes.faceCount(), detectRes.confidence()));
        assertTrue(detectRes.faceDetected(), "Face must be detected in full frame mode");
        assertEquals(1, detectRes.faceCount(), "Exactly 1 face must be detected in full frame mode");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(singleFace, "jpg", baos);
        AntiSpoofResponse eval = onnxLivenessService.evaluateFaceImage(baos.toByteArray());

        System.out.println(String.format("FULL-FRAME VERDICT: class=%s, isReal=%s, liveness=%.2f, reason=%s",
                eval.getClassification(), eval.isReal(), eval.getLivenessScore(), eval.getReasoning()));
        assertNotEquals("NO_FACE", eval.getClassification(), "Full frame face must never be rejected as NO_FACE");
        assertTrue(eval.isReal(), "Single genuine face in full frame mode must pass verification");

        // 2. 1280x720 16:9 widescreen webcam stream (user in standard office/room setting)
        BufferedImage wideWebcam = new BufferedImage(1280, 720, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D gWide = wideWebcam.createGraphics();
        gWide.setColor(new Color(230, 230, 230));
        gWide.fillRect(0, 0, 1280, 720);
        gWide.drawImage(singleFace, (1280 - 640) / 2, (720 - 480) / 2, null);
        gWide.dispose();

        OnnxLivenessService.FaceDetectionResult detectWide = onnxLivenessService.detectFace(wideWebcam);
        System.out.println(String.format("WIDESCREEN 16:9 DETECTION: detected=%s, count=%d, conf=%.4f",
                detectWide.faceDetected(), detectWide.faceCount(), detectWide.confidence()));
        assertTrue(detectWide.faceDetected(), "Face must be detected in 16:9 widescreen webcam frame");
        assertEquals(1, detectWide.faceCount(), "Exactly 1 face in 16:9 widescreen frame");
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

    @Test
    void testInterviewProctoringHeadPoseDetection() throws Exception {
        java.io.File realFile = new java.io.File("src/test/resources/image_T1.jpg");
        if (!realFile.exists()) return;
        BufferedImage baseImg = ImageIO.read(realFile);

        // 1. Straight-facing candidate (0 degrees)
        ByteArrayOutputStream baos0 = new ByteArrayOutputStream();
        ImageIO.write(baseImg, "jpg", baos0);
        AntiSpoofResponse straightResp = onnxLivenessService.evaluateFaceImage(baos0.toByteArray());
        System.out.println("STRAIGHT: angle=" + straightResp.getHeadPoseAngle() + ", roll=" + straightResp.getHeadRoll() + ", yaw=" + straightResp.getHeadYaw() + ", pitch=" + straightResp.getHeadPitch() + ", alert=" + straightResp.isCheatingAlert());
        assertTrue(straightResp.getHeadPoseAngle() < 30.0, "Straight face angle must be < 30 degrees");
        assertFalse(straightResp.isCheatingAlert(), "Straight face must not trigger cheating alert");

        // 2. Candidate turning / tilting 35 degrees
        int w = baseImg.getWidth();
        int h = baseImg.getHeight();
        BufferedImage rotated35 = new BufferedImage(w, h, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D g = rotated35.createGraphics();
        g.setColor(new Color(240, 240, 240));
        g.fillRect(0, 0, w, h);
        g.rotate(Math.toRadians(35), w / 2.0, h / 2.0);
        g.drawImage(baseImg, 0, 0, null);
        g.dispose();

        ByteArrayOutputStream baos35 = new ByteArrayOutputStream();
        ImageIO.write(rotated35, "jpg", baos35);
        AntiSpoofResponse tiltResp35 = onnxLivenessService.evaluateFaceImage(baos35.toByteArray());
        System.out.println("TILT +35: angle=" + tiltResp35.getHeadPoseAngle() + ", roll=" + tiltResp35.getHeadRoll() + ", yaw=" + tiltResp35.getHeadYaw() + ", pitch=" + tiltResp35.getHeadPitch() + ", alert=" + tiltResp35.isCheatingAlert());
        assertTrue(tiltResp35.getHeadPoseAngle() >= 30.0, "Tilted face angle must be >= 30 degrees, was: " + tiltResp35.getHeadPoseAngle());
        assertTrue(tiltResp35.isCheatingAlert(), "Head movement > 30 degrees must trigger cheating alert");
        assertTrue(tiltResp35.getProctorWarning().contains("CHEATING DETECTED"), "Must contain cheating warning");

        // 3. Candidate tilting -35 degrees
        BufferedImage rotatedNeg35 = new BufferedImage(w, h, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D gNeg = rotatedNeg35.createGraphics();
        gNeg.setColor(new Color(240, 240, 240));
        gNeg.fillRect(0, 0, w, h);
        gNeg.rotate(Math.toRadians(-35), w / 2.0, h / 2.0);
        gNeg.drawImage(baseImg, 0, 0, null);
        gNeg.dispose();

        ByteArrayOutputStream baosNeg35 = new ByteArrayOutputStream();
        ImageIO.write(rotatedNeg35, "jpg", baosNeg35);
        AntiSpoofResponse tiltRespNeg35 = onnxLivenessService.evaluateFaceImage(baosNeg35.toByteArray());
        System.out.println("TILT -35: angle=" + tiltRespNeg35.getHeadPoseAngle() + ", roll=" + tiltRespNeg35.getHeadRoll() + ", yaw=" + tiltRespNeg35.getHeadYaw() + ", pitch=" + tiltRespNeg35.getHeadPitch() + ", alert=" + tiltRespNeg35.isCheatingAlert());
        assertTrue(tiltRespNeg35.getHeadPoseAngle() >= 30.0, "Tilted -35 angle must be >= 30 degrees, was: " + tiltRespNeg35.getHeadPoseAngle());
        assertTrue(tiltRespNeg35.isCheatingAlert(), "Negative 35 degree tilt must trigger cheating alert");
    }
}
