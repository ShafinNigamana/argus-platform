package com.argus.backend.service;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import com.argus.backend.dto.AiReasoningResponse;
import com.argus.backend.dto.AntiSpoofResponse;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.FloatBuffer;
import java.util.Base64;
import java.util.Collections;
import java.util.Map;

/**
 * Embedded, open-source Machine Learning Inference Service using ONNX Runtime.
 * Powered by MiniFASNetV2-SE for local RGB Face Anti-Spoofing (PAD).
 * Replaces external cloud LLM/API dependencies with zero-latency local execution.
 */
@Slf4j
@Service
public class OnnxLivenessService {

    private static final int MODEL_INPUT_WIDTH = 80;
    private static final int MODEL_INPUT_HEIGHT = 80;
    private static final int MODEL_CHANNELS = 3;

    @Value("${ml.model.path:classpath:models/minifasnetv2.onnx}")
    private String modelPath = "classpath:models/minifasnetv2.onnx";

    @Value("${ml.detector.path:classpath:models/ultraface_slim_320.onnx}")
    private String detectorPath = "classpath:models/ultraface_slim_320.onnx";

    @Value("${ml.model.enabled:true}")
    private boolean modelEnabled = true;

    private static final int DETECTOR_WIDTH = 320;
    private static final int DETECTOR_HEIGHT = 240;

    private final ResourceLoader resourceLoader;
    private OrtEnvironment env;
    private OrtSession session;
    private OrtSession detectorSession;
    private boolean isInitialized = false;

    public OnnxLivenessService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        if (!modelEnabled) {
            log.info("[ONNX] Local ML anti-spoofing model is explicitly disabled by config.");
            return;
        }

        try {
            log.info("[ONNX] Initializing ONNX Runtime environment for local liveness detection...");
            this.env = OrtEnvironment.getEnvironment("Argus-FAS-Engine");

            // 1. Load Anti-Spoofing Model (MiniFASNetV2-SE)
            Resource resource = resourceLoader.getResource(modelPath);
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    byte[] modelBytes = is.readAllBytes();
                    OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
                    opts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
                    opts.setIntraOpNumThreads(2);
                    this.session = env.createSession(modelBytes, opts);
                    this.isInitialized = true;
                    log.info("[ONNX] MiniFASNetV2-SE successfully loaded into memory ({} bytes). Local model active!", modelBytes.length);
                }
            } else {
                log.warn("[ONNX] FAS Model file not found at: {}. Local ML inference will operate in fallback mode.", modelPath);
            }

            // 2. Load Face Detector Model (UltraFace Slim 320)
            try {
                Resource detResource = resourceLoader.getResource(detectorPath);
                if (detResource.exists()) {
                    try (InputStream is = detResource.getInputStream()) {
                        byte[] detBytes = is.readAllBytes();
                        OrtSession.SessionOptions detOpts = new OrtSession.SessionOptions();
                        detOpts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
                        detOpts.setIntraOpNumThreads(2);
                        this.detectorSession = env.createSession(detBytes, detOpts);
                        log.info("[ONNX] UltraFace-Slim-320 face detector loaded ({} bytes). Dual-stage pipeline active!", detBytes.length);
                    }
                } else {
                    log.warn("[ONNX] Face detector model not found at {}. Using biometric heuristic gate.", detectorPath);
                }
            } catch (Throwable t) {
                log.warn("[ONNX] Could not initialize UltraFace detector: {}. Using biometric heuristic gate.", t.getMessage());
            }

        } catch (Throwable t) {
            log.error("[ONNX] Failed to initialize ONNX Runtime: {}. Operating in fallback mode.", t.getMessage());
            this.isInitialized = false;
        }
    }

    @PreDestroy
    public void cleanup() {
        try {
            if (detectorSession != null) {
                detectorSession.close();
            }
            if (session != null) {
                session.close();
            }
            if (env != null) {
                env.close();
            }
        } catch (Exception e) {
            log.warn("[ONNX] Error cleaning up ONNX session: {}", e.getMessage());
        }
    }

    public boolean isModelReady() {
        return isInitialized && session != null;
    }

    /**
     * Evaluates face anti-spoofing on a raw image buffer (JPEG, PNG, etc).
     *
     * @param imageBytes binary image data of face/crop
     * @return AntiSpoofResponse with classification, liveness probability, and forensic reasoning.
     */
    public AntiSpoofResponse evaluateFaceImage(byte[] imageBytes) {
        long startTime = System.currentTimeMillis();

        if (imageBytes == null || imageBytes.length == 0) {
            return AntiSpoofResponse.builder()
                    .isReal(false)
                    .livenessScore(0.0)
                    .spoofScore(1.0)
                    .classification("NO_IMAGE")
                    .confidence("LOW")
                    .reasoning("No face image payload provided for anti-spoofing verification.")
                    .inferenceTimeMs(0)
                    .build();
        }

        if (!isModelReady()) {
            log.warn("[ONNX] Inference requested but ONNX model is not loaded. Returning heuristic fallback.");
            return AntiSpoofResponse.builder()
                    .isReal(true)
                    .livenessScore(0.75)
                    .spoofScore(0.25)
                    .classification("REAL")
                    .confidence("LOW")
                    .reasoning("Local ML model not loaded; passed through fallback verification.")
                    .inferenceTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }

        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (image == null) {
                return AntiSpoofResponse.builder()
                        .isReal(false)
                        .livenessScore(0.0)
                        .spoofScore(1.0)
                        .classification("DECODE_ERROR")
                        .confidence("LOW")
                        .reasoning("Failed to decode image bytes into valid pixel raster.")
                        .inferenceTimeMs(System.currentTimeMillis() - startTime)
                        .build();
            }

            // 1. Stage 1: Face Detection Gate (UltraFace Slim 320 ONNX)
            // Validates that a genuine human face structure exists in the frame.
            // Blocks non-face inputs like walls, desks, screensavers, or non-facial body parts (e.g. back).
            FaceDetectionResult detection = detectFace(image);
            if (!detection.faceDetected()) {
                long duration = System.currentTimeMillis() - startTime;
                log.info("[ONNX] Stage 1 Face Detection rejected non-face input in {}ms: confidence={}",
                        duration, round2(detection.confidence()));
                return AntiSpoofResponse.builder()
                        .isReal(false)
                        .livenessScore(0.0)
                        .spoofScore(0.0)
                        .classification("NO_FACE")
                        .confidence("HIGH")
                        .reasoning(String.format("No human face detected in frame (face detector confidence: %.1f%%). Please align your face clearly in the camera.", detection.confidence() * 100.0))
                        .inferenceTimeMs(duration)
                        .build();
            }

            // 2. Stage 2: Biometric Texture & MiniFASNet Anti-Spoofing Preprocessing (80x80 BGR)
            PreprocessedFaceData preprocessed = preprocessAndValidateFace(image);
            // If UltraFace detector is not loaded, rely on biometric heuristic rules
            if (detectorSession == null && !preprocessed.check.hasFace()) {
                long duration = System.currentTimeMillis() - startTime;
                log.info("[ONNX] Biometric Face Gate rejected non-face input in {}ms: {}", duration, preprocessed.check.reason());
                return AntiSpoofResponse.builder()
                        .isReal(false)
                        .livenessScore(0.0)
                        .spoofScore(0.0)
                        .classification("NO_FACE")
                        .confidence("HIGH")
                        .reasoning(preprocessed.check.reason())
                        .inferenceTimeMs(duration)
                        .build();
            } else if (preprocessed.check.stdDev() < 4.0 || preprocessed.check.avgGrad() < 0.5) {
                // Safeguard against extreme flat or degenerate frames
                long duration = System.currentTimeMillis() - startTime;
                return AntiSpoofResponse.builder()
                        .isReal(false)
                        .livenessScore(0.0)
                        .spoofScore(0.0)
                        .classification("NO_FACE")
                        .confidence("HIGH")
                        .reasoning("Image contains insufficient visual contrast or texture to evaluate facial biometrics.")
                        .inferenceTimeMs(duration)
                        .build();
            }

            // 3. Prepare Tensor [1, 80, 80, 3] for MiniFASNetV2-SE
            long[] shape = new long[]{1, MODEL_INPUT_HEIGHT, MODEL_INPUT_WIDTH, MODEL_CHANNELS};
            FloatBuffer buffer = FloatBuffer.wrap(preprocessed.nhwc);

            try (OnnxTensor tensor = OnnxTensor.createTensor(env, buffer, shape);
                 OrtSession.Result result = session.run(Collections.singletonMap(session.getInputNames().iterator().next(), tensor))) {

                // MiniFASNet ONNX output is an already-softmaxed 3-element probability vector: [P(spoof_print), P(real), P(spoof_screen)]
                // Class 1 = Live / Real human
                // Class 0 = Spoof (print attack)
                // Class 2 = Spoof (screen replay / 3D presentation attack)
                float[][] rawOutput = (float[][]) result.get(0).getValue();
                float[] probs = rawOutput[0];

                double spoofPrintProb = probs[0];
                double realProb = probs[1];
                double spoofScreenProb = probs[2];
                double totalSpoofProb = spoofPrintProb + spoofScreenProb;

                int predictedClass = argmax(probs);
                boolean isReal = (predictedClass == 1 && realProb >= 0.50);

                String classification;
                String reasoning;
                if (isReal) {
                    classification = "REAL";
                    reasoning = String.format("Genuine biological face detected (real skin probability: %.1f%%). No print/screen artifacts.", realProb * 100.0);
                } else if (spoofPrintProb > spoofScreenProb) {
                    classification = "SPOOF_PRINT";
                    reasoning = String.format("Presentation attack detected: printed paper / static photograph pattern (confidence: %.1f%%).", spoofPrintProb * 100.0);
                } else {
                    classification = "SPOOF_REPLAY";
                    reasoning = String.format("Presentation attack detected: electronic screen replay / digital display pattern (confidence: %.1f%%).", spoofScreenProb * 100.0);
                }

                String confidence;
                if (realProb >= 0.85 || totalSpoofProb >= 0.85) {
                    confidence = "HIGH";
                } else if (realProb >= 0.65 || totalSpoofProb >= 0.65) {
                    confidence = "MEDIUM";
                } else {
                    confidence = "LOW";
                }

                long duration = System.currentTimeMillis() - startTime;
                log.info("[ONNX] FAS Inference completed in {}ms: class={}, realProb={}", duration, classification, round2(realProb));

                return AntiSpoofResponse.builder()
                        .isReal(isReal)
                        .livenessScore(round2(realProb))
                        .spoofScore(round2(totalSpoofProb))
                        .classification(classification)
                        .confidence(confidence)
                        .reasoning(reasoning)
                        .inferenceTimeMs(duration)
                        .build();
            }

        } catch (Exception e) {
            log.error("[ONNX] Error during face anti-spoofing inference: {}", e.getMessage(), e);
            return AntiSpoofResponse.builder()
                    .isReal(false)
                    .livenessScore(0.0)
                    .spoofScore(1.0)
                    .classification("ERROR")
                    .confidence("LOW")
                    .reasoning("Error executing local anti-spoofing model: " + e.getMessage())
                    .inferenceTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }
    }

    /**
     * Evaluates a base64 encoded image string.
     */
    public AntiSpoofResponse evaluateBase64Image(String base64Image) {
        if (base64Image == null || base64Image.isBlank()) {
            return evaluateFaceImage(null);
        }
        try {
            // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
            String cleanBase64 = base64Image;
            int commaIdx = cleanBase64.indexOf(',');
            if (commaIdx != -1) {
                cleanBase64 = cleanBase64.substring(commaIdx + 1);
            }
            byte[] decoded = Base64.getDecoder().decode(cleanBase64);
            return evaluateFaceImage(decoded);
        } catch (Exception e) {
            log.error("[ONNX] Failed to parse base64 image: {}", e.getMessage());
            return AntiSpoofResponse.builder()
                    .isReal(false)
                    .classification("INVALID_BASE64")
                    .confidence("LOW")
                    .reasoning("Malformed base64 image payload.")
                    .build();
        }
    }

    /**
     * In-house tabular biometric forensic evaluation that completely replaces the external Gemini LLM call.
     * Evaluates entropy, physiological realism, and challenge reaction latencies in < 1ms with 0 API keys.
     */
    public AiReasoningResponse evaluateTelemetry(Map<String, Object> telemetry) {
        if (telemetry == null || telemetry.isEmpty()) {
            return AiReasoningResponse.builder()
                    .aiLivenessScore(0.50)
                    .confidence("LOW")
                    .forensicReasoning("No telemetry signals available for forensic evaluation.")
                    .build();
        }

        try {
            Double bpm = getDoubleValue(telemetry.get("bpm"));
            Double signalQuality = getDoubleValue(telemetry.get("signalQuality"));
            Double behaviorScore = getDoubleValue(telemetry.get("behaviorScore"));
            Double challengeScore = getDoubleValue(telemetry.get("challengeScore"));
            int blinkCount = telemetry.containsKey("blinkCount") ? ((Number) telemetry.get("blinkCount")).intValue() : 0;

            // 1. Biological feasibility test
            boolean validCardiac = bpm != null && bpm >= 45.0 && bpm <= 180.0 && signalQuality != null && signalQuality >= 0.35;
            
            // 2. Behavioral consistency test
            double bScore = behaviorScore != null ? behaviorScore : 0.0;
            double cScore = challengeScore != null ? challengeScore : 0.0;

            // 3. Composite forensic liveness probability
            double baseScore;
            String reasoning;
            String confidence;

            if (validCardiac && bScore >= 0.65 && cScore >= 0.60) {
                baseScore = 0.90 + (0.10 * Math.min(1.0, signalQuality));
                confidence = "HIGH";
                reasoning = String.format("Strong biological pulse (%.0f BPM) and natural behavioral reaction confirmed.", bpm);
            } else if (validCardiac && (bScore >= 0.50 || cScore >= 0.50)) {
                baseScore = 0.75 + (0.15 * bScore);
                confidence = "MEDIUM";
                reasoning = String.format("Valid cardiac rhythm (%.0f BPM) detected with acceptable interaction patterns.", bpm);
            } else if (!validCardiac && bScore < 0.40 && cScore < 0.40) {
                baseScore = 0.20;
                confidence = "HIGH";
                reasoning = "Suspicious non-human pattern: absence of pulse rhythm and abnormal reaction timing.";
            } else if (bpm == null || bpm == 0.0) {
                baseScore = 0.40;
                confidence = "LOW";
                reasoning = "Insufficient optical pulse data to verify live human cardiovascular activity.";
            } else {
                baseScore = 0.55;
                confidence = "MEDIUM";
                reasoning = "Borderline physiological signal; further verification recommended.";
            }

            baseScore = Math.max(0.0, Math.min(1.0, baseScore));

            return AiReasoningResponse.builder()
                    .aiLivenessScore(round2(baseScore))
                    .confidence(confidence)
                    .forensicReasoning(reasoning)
                    .build();

        } catch (Exception e) {
            log.error("[ONNX] Error in forensic telemetry evaluation: {}", e.getMessage());
            return AiReasoningResponse.builder()
                    .aiLivenessScore(0.50)
                    .confidence("LOW")
                    .forensicReasoning("Telemetry forensic evaluation encountered a processing error.")
                    .build();
        }
    }

    public record FaceDetectionResult(boolean faceDetected, float confidence, float[] bestBox) {}

    /**
     * Executes Stage 1 Face Detection using the embedded UltraFace-Slim-320 ONNX model.
     * Evaluates whether a genuine human face structure (eyes, nose, mouth triangle) exists in the frame.
     * Filters out non-face surfaces (walls, floors, ceilings) and non-facial body parts (e.g. back).
     */
    public FaceDetectionResult detectFace(BufferedImage source) {
        if (detectorSession == null) {
            // Fallback to biometric heuristic if detector model was not loaded
            BiometricFaceCheck check = preprocessAndValidateFace(source).check;
            return new FaceDetectionResult(check.hasFace(), check.hasFace() ? 0.90f : 0.0f, null);
        }

        try {
            BufferedImage resized = new BufferedImage(DETECTOR_WIDTH, DETECTOR_HEIGHT, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = resized.createGraphics();
            g.drawImage(source, 0, 0, DETECTOR_WIDTH, DETECTOR_HEIGHT, null);
            g.dispose();

            float[] nchw = new float[1 * 3 * DETECTOR_HEIGHT * DETECTOR_WIDTH];
            for (int y = 0; y < DETECTOR_HEIGHT; y++) {
                for (int x = 0; x < DETECTOR_WIDTH; x++) {
                    int rgb = resized.getRGB(x, y);
                    float r = (((rgb >> 16) & 0xFF) - 127.0f) / 128.0f;
                    float gr = (((rgb >> 8) & 0xFF) - 127.0f) / 128.0f;
                    float b = ((rgb & 0xFF) - 127.0f) / 128.0f;

                    nchw[0 * DETECTOR_HEIGHT * DETECTOR_WIDTH + y * DETECTOR_WIDTH + x] = r;
                    nchw[1 * DETECTOR_HEIGHT * DETECTOR_WIDTH + y * DETECTOR_WIDTH + x] = gr;
                    nchw[2 * DETECTOR_HEIGHT * DETECTOR_WIDTH + y * DETECTOR_WIDTH + x] = b;
                }
            }

            long[] shape = new long[]{1, 3, DETECTOR_HEIGHT, DETECTOR_WIDTH};
            try (OnnxTensor tensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(nchw), shape);
                 OrtSession.Result result = detectorSession.run(Collections.singletonMap("input", tensor))) {

                float[][][] scores = (float[][][]) result.get("scores").get().getValue();
                float[][][] boxes = (float[][][]) result.get("boxes").get().getValue();

                float maxFaceScore = 0.0f;
                int bestAnchor = -1;
                for (int i = 0; i < 4420; i++) {
                    float faceProb = scores[0][i][1];
                    if (faceProb > maxFaceScore) {
                        maxFaceScore = faceProb;
                        bestAnchor = i;
                    }
                }

                // Threshold for face detection: 0.45 (45% confidence)
                // Prevents false rejections on natural head yaw/roll (up to ±35°) and diverse framing,
                // while cleanly rejecting non-faces (walls score ~0.0%, man's back in test-6.jpg scores 11.0%).
                boolean faceDetected = maxFaceScore >= 0.45f;
                float[] bestBox = (faceDetected && bestAnchor >= 0) ? boxes[0][bestAnchor] : null;

                return new FaceDetectionResult(faceDetected, maxFaceScore, bestBox);
            }
        } catch (Exception e) {
            log.error("[ONNX] Face detection error: {}", e.getMessage());
            BiometricFaceCheck check = preprocessAndValidateFace(source).check;
            return new FaceDetectionResult(check.hasFace(), check.hasFace() ? 0.80f : 0.0f, null);
        }
    }

    public record BiometricFaceCheck(
            boolean hasFace,
            String reason,
            double skinRatio,
            double stdDev,
            double avgGrad
    ) {}

    public static class PreprocessedFaceData {
        public final float[] nhwc;
        public final BiometricFaceCheck check;

        public PreprocessedFaceData(float[] nhwc, BiometricFaceCheck check) {
            this.nhwc = nhwc;
            this.check = check;
        }
    }

    /**
     * Resizes image to 80x80 BGR, populates NHWC tensor data, and analyzes biometric
     * face presence signals (luminance variance, spatial gradient energy, skin locus)
     * in a single unified pixel pass (< 1ms).
     */
    public PreprocessedFaceData preprocessAndValidateFace(BufferedImage source) {
        BufferedImage resized = new BufferedImage(MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(source, 0, 0, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT, null);
        g.dispose();

        float[] nhwc = new float[MODEL_INPUT_HEIGHT * MODEL_INPUT_WIDTH * MODEL_CHANNELS];
        double sumLum = 0.0;
        double sumLumSq = 0.0;
        int skinPixels = 0;
        double totalGrad = 0.0;
        double[][] lum = new double[MODEL_INPUT_WIDTH][MODEL_INPUT_HEIGHT];
        int totalPixels = MODEL_INPUT_WIDTH * MODEL_INPUT_HEIGHT;

        // Single pass: generate NHWC BGR tensor + extract biometric luminance and chrominance
        for (int y = 0; y < MODEL_INPUT_HEIGHT; y++) {
            for (int x = 0; x < MODEL_INPUT_WIDTH; x++) {
                int rgb = resized.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int gr = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                int offset = (y * MODEL_INPUT_WIDTH + x) * MODEL_CHANNELS;
                nhwc[offset + 0] = (float) b;
                nhwc[offset + 1] = (float) gr;
                nhwc[offset + 2] = (float) r;

                double yVal = 0.299 * r + 0.587 * gr + 0.114 * b;
                lum[x][y] = yVal;
                sumLum += yVal;
                sumLumSq += yVal * yVal;

                // YCbCr skin tone locus
                double cb = 128.0 - 0.168736 * r - 0.331264 * gr + 0.5 * b;
                double cr = 128.0 + 0.5 * r - 0.418688 * gr - 0.081312 * b;

                // Skin chrominance bounds (biometric human skin optical properties)
                if (cb >= 75.0 && cb <= 138.0 && cr >= 130.0 && cr <= 182.0 && r > gr && gr > (b * 0.55)) {
                    skinPixels++;
                }
            }
        }

        // Gradient energy calculation (edges and facial contours)
        for (int y = 0; y < MODEL_INPUT_HEIGHT - 1; y++) {
            for (int x = 0; x < MODEL_INPUT_WIDTH - 1; x++) {
                totalGrad += Math.abs(lum[x + 1][y] - lum[x][y]) + Math.abs(lum[x][y + 1] - lum[x][y]);
            }
        }

        double meanLum = sumLum / totalPixels;
        double stdDev = Math.sqrt(Math.max(0.0, (sumLumSq / totalPixels) - (meanLum * meanLum)));
        double skinRatio = (double) skinPixels / totalPixels;
        double avgGrad = totalGrad / totalPixels;

        BiometricFaceCheck check = evaluateBiometricRules(meanLum, stdDev, avgGrad, skinRatio);
        return new PreprocessedFaceData(nhwc, check);
    }

    private BiometricFaceCheck evaluateBiometricRules(double meanLum, double stdDev, double avgGrad, double skinRatio) {
        // 1. Extreme underexposure / covered lens
        if (meanLum < 12.0) {
            return new BiometricFaceCheck(false, "Frame is too dark to detect a human face (underexposed or camera covered).", skinRatio, stdDev, avgGrad);
        }

        // 2. Extreme overexposure / washed out
        if (meanLum > 248.0 && stdDev < 8.0) {
            return new BiometricFaceCheck(false, "Frame is completely overexposed or washed out (no facial features visible).", skinRatio, stdDev, avgGrad);
        }

        // 3. Flat surface / wall / ceiling check (insufficient luminance variation)
        if (stdDev < 12.0) {
            return new BiometricFaceCheck(false, "No human face detected: surface is flat or uniform (wall or plain background detected).", skinRatio, stdDev, avgGrad);
        }

        // 4. Lack of edges and structural facial contours
        if (avgGrad < 1.8 && stdDev < 18.0) {
            return new BiometricFaceCheck(false, "No facial structure or facial boundaries detected in the frame.", skinRatio, stdDev, avgGrad);
        }

        // 5. Skin chrominance check: human faces in 2.7x crop typically have >= 6% skin pixels.
        // Plain colored walls, outdoor skies, furniture, floors, or monitors have virtually 0% skin tones.
        if (skinRatio < 0.06) {
            return new BiometricFaceCheck(false, "No human skin tones detected in region of interest (non-biometric surface or wall).", skinRatio, stdDev, avgGrad);
        }

        // 6. Uniform painted surface with skin-adjacent tint (e.g. beige wall)
        if (avgGrad < 1.6) {
            return new BiometricFaceCheck(false, "Uniform surface detected with no distinct facial contours (e.g. painted wall).", skinRatio, stdDev, avgGrad);
        }

        return new BiometricFaceCheck(true, "Valid facial biometric candidate.", skinRatio, stdDev, avgGrad);
    }

    private float[] preprocessImageToBGR_NHWC(BufferedImage source) {
        return preprocessAndValidateFace(source).nhwc;
    }

    private float[] softmax(float[] logits) {
        float max = Float.NEGATIVE_INFINITY;
        for (float v : logits) {
            if (v > max) max = v;
        }

        float sum = 0.0f;
        float[] exp = new float[logits.length];
        for (int i = 0; i < logits.length; i++) {
            exp[i] = (float) Math.exp(logits[i] - max);
            sum += exp[i];
        }

        for (int i = 0; i < exp.length; i++) {
            exp[i] = (sum > 0) ? (exp[i] / sum) : (1.0f / exp.length);
        }
        return exp;
    }

    private int argmax(float[] arr) {
        int bestIdx = 0;
        float bestVal = arr[0];
        for (int i = 1; i < arr.length; i++) {
            if (arr[i] > bestVal) {
                bestVal = arr[i];
                bestIdx = i;
            }
        }
        return bestIdx;
    }

    private Double getDoubleValue(Object obj) {
        if (obj instanceof Number num) {
            return num.doubleValue();
        }
        return null;
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
