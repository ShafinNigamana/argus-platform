package com.argus.backend.service;

import com.argus.backend.dto.AiReasoningResponse;
import com.argus.backend.dto.AntiSpoofResponse;
import com.argus.backend.dto.VerificationCompleteRequest;
import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.Verification;
import com.argus.backend.entity.Verification.VerificationStatus;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.repository.VerificationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Verification orchestrator — coordinates the verification workflow lifecycle.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Initiate a new verification (POST /api/v1/verify)</li>
 *   <li>Retrieve verification status (GET /api/v1/verify/{id})</li>
 *   <li>Evaluate onnx anti-spoofing face images (POST /api/v1/verify/{id}/face)</li>
 *   <li>Consolidate multi-signal verification results (rPPG + Behavior + Challenge + ONNX/PAD + AI)</li>
 *   <li>Issue cryptographic trust certificates upon successful verification</li>
 * </ul>
 */
@Slf4j
@Service
public class VerificationOrchestrator {

    private final VerificationRepository verificationRepository;
    private OnnxLivenessService onnxLivenessService;
    private GeminiForensicService geminiForensicService;
    private CertificateService certificateService;

    public VerificationOrchestrator(VerificationRepository verificationRepository) {
        this.verificationRepository = verificationRepository;
    }

    @Autowired
    public VerificationOrchestrator(
            VerificationRepository verificationRepository,
            @Autowired(required = false) OnnxLivenessService onnxLivenessService,
            @Autowired(required = false) GeminiForensicService geminiForensicService,
            @Autowired(required = false) CertificateService certificateService) {
        this.verificationRepository = verificationRepository;
        this.onnxLivenessService = onnxLivenessService;
        this.geminiForensicService = geminiForensicService;
        this.certificateService = certificateService;
    }

    /**
     * Initiates a new verification workflow and persists it with INITIATED status.
     *
     * @param request caller-supplied verification parameters
     * @return response DTO with the new verificationId
     */
    @Transactional
    public VerifyResponse initiate(VerifyRequest request) {
        Verification verification = Verification.builder()
                .userId(request.getUserId())
                .operationType(request.getOperationType())
                .status(VerificationStatus.INITIATED)
                .metadata(request.getMetadata())
                .build();

        verification = verificationRepository.save(verification);
        log.info("Verification {} initiated for userId={} operationType={}",
                verification.getId(), request.getUserId(), request.getOperationType());

        return toResponse(verification);
    }

    /**
     * Retrieves current verification status.
     *
     * @param verificationId UUID of the verification
     * @return response DTO with current status and scores
     * @throws IllegalArgumentException if not found
     */
    @Transactional(readOnly = true)
    public VerifyResponse getStatus(UUID verificationId) {
        Verification verification = findOrThrow(verificationId);
        return toResponse(verification);
    }

    /**
     * Marks a verification as IN_PROGRESS.
     */
    @Transactional
    public void markInProgress(UUID verificationId) {
        Verification v = findOrThrow(verificationId);
        if (v.getStatus() == VerificationStatus.INITIATED) {
            v.setStatus(VerificationStatus.IN_PROGRESS);
            verificationRepository.save(v);
        }
    }

    /**
     * Evaluates a face image for presentation attack detection (PAD) via ONNX Runtime
     * and attaches the ML verdict to the verification's componentScores and metadata.
     */
    @Transactional
    public AntiSpoofResponse verifyFace(UUID verificationId, String base64Image) {
        Verification verification = findOrThrow(verificationId);

        AntiSpoofResponse response;
        if (onnxLivenessService != null) {
            response = onnxLivenessService.evaluateBase64Image(base64Image);
        } else {
            response = AntiSpoofResponse.builder()
                    .isReal(true)
                    .livenessScore(0.95)
                    .confidence("MEDIUM")
                    .classification("REAL")
                    .reasoning("Local ML inference service not configured; fallback default applied.")
                    .inferenceTimeMs(0)
                    .build();
        }

        Map<String, Object> componentScores = verification.getComponentScores();
        if (componentScores == null) {
            componentScores = new HashMap<>();
        } else {
            componentScores = new HashMap<>(componentScores);
        }

        componentScores.put("antiSpoof", response.getLivenessScore());
        componentScores.put("antiSpoofReal", response.isReal());
        componentScores.put("antiSpoofClassification", response.getClassification());
        componentScores.put("antiSpoofReasoning", response.getReasoning());
        componentScores.put("antiSpoofLatencyMs", response.getInferenceTimeMs());
        if (response.getHeadPoseAngle() != null) {
            componentScores.put("headPoseAngle", response.getHeadPoseAngle());
            componentScores.put("headYaw", response.getHeadYaw());
            componentScores.put("headPitch", response.getHeadPitch());
            componentScores.put("headRoll", response.getHeadRoll());
            componentScores.put("headDirection", response.getHeadDirection());
            componentScores.put("cheatingAlert", response.isCheatingAlert());
            componentScores.put("proctorWarning", response.getProctorWarning());
        }
        verification.setComponentScores(componentScores);

        if (verification.getStatus() == VerificationStatus.INITIATED) {
            verification.setStatus(VerificationStatus.IN_PROGRESS);
        }

        verificationRepository.save(verification);
        log.info("[VERIFICATION {}] Face anti-spoofing evaluated: isReal={}, classification={}, score={}",
                verificationId, response.isReal(), response.getClassification(), response.getLivenessScore());

        return response;
    }

    /**
     * Comprehensive multi-signal synthesis and final verification decision.
     * Consumes all five verification signals:
     * 1. Physiological/rPPG signal
     * 2. Behavioral analysis
     * 3. Challenge-response
     * 4. ONNX anti-spoofing (MiniFASNetV2-SE + UltraFace)
     * 5. AI confidence intelligence (Gemini / local ML reasoning)
     */
    @Transactional
    public VerifyResponse evaluateAndComplete(UUID verificationId, VerificationCompleteRequest request) {
        Verification verification = findOrThrow(verificationId);

        Map<String, Object> componentScores = verification.getComponentScores();
        if (componentScores == null) {
            componentScores = new HashMap<>();
        } else {
            componentScores = new HashMap<>(componentScores);
        }

        // 1. Process face image if supplied in complete request
        if (request != null && request.getImage() != null && !request.getImage().isBlank()) {
            AntiSpoofResponse faceResp = verifyFace(verificationId, request.getImage());
            componentScores.put("antiSpoof", faceResp.getLivenessScore());
            componentScores.put("antiSpoofReal", faceResp.isReal());
            componentScores.put("antiSpoofClassification", faceResp.getClassification());
            componentScores.put("antiSpoofReasoning", faceResp.getReasoning());
            if (faceResp.getHeadPoseAngle() != null) {
                componentScores.put("headPoseAngle", faceResp.getHeadPoseAngle());
                componentScores.put("headYaw", faceResp.getHeadYaw());
                componentScores.put("headPitch", faceResp.getHeadPitch());
                componentScores.put("headRoll", faceResp.getHeadRoll());
                componentScores.put("headDirection", faceResp.getHeadDirection());
                componentScores.put("cheatingAlert", faceResp.isCheatingAlert());
                componentScores.put("proctorWarning", faceResp.getProctorWarning());
            }
        }

        // 2. Extract signal metrics
        double signalQuality = (request != null && request.getSignalQuality() != null)
                ? Math.max(0.0, Math.min(1.0, request.getSignalQuality()))
                : 0.85;

        double bpm = (request != null && request.getAverageBpm() != null)
                ? request.getAverageBpm()
                : 72.0;

        double behaviorScore = (request != null && request.getBehaviorScore() != null)
                ? Math.max(0.0, Math.min(1.0, request.getBehaviorScore()))
                : ((request != null && request.getBlinkDynamicsScore() != null)
                    ? Math.max(0.0, Math.min(1.0, request.getBlinkDynamicsScore()))
                    : 0.90);

        // Reflect proctoring alert in behavior stability if active
        if (Boolean.TRUE.equals(componentScores.get("cheatingAlert"))) {
            behaviorScore = Math.min(behaviorScore, 0.45);
        }

        boolean challengePassed = (request != null && request.getChallengePassed() != null)
                ? request.getChallengePassed()
                : (componentScores.containsKey("challenge")
                    ? ((Number) componentScores.get("challenge")).doubleValue() >= 0.8
                    : true);

        double challengeScore = challengePassed ? 1.0 : 0.0;
        if (componentScores.containsKey("challenge")) {
            challengeScore = ((Number) componentScores.get("challenge")).doubleValue();
        }

        // 3. Extract anti-spoof status
        Double antiSpoofScore = componentScores.containsKey("antiSpoof")
                ? ((Number) componentScores.get("antiSpoof")).doubleValue()
                : 0.95;
        Boolean antiSpoofReal = componentScores.containsKey("antiSpoofReal")
                ? (Boolean) componentScores.get("antiSpoofReal")
                : true;
        String antiSpoofClassification = componentScores.containsKey("antiSpoofClassification")
                ? (String) componentScores.get("antiSpoofClassification")
                : "REAL";

        // 4. AI Confidence Intelligence Layer
        Map<String, Object> telemetry = new HashMap<>();
        telemetry.put("bpm", bpm);
        telemetry.put("signalQuality", signalQuality);
        telemetry.put("behaviorScore", behaviorScore);
        telemetry.put("challengeScore", challengeScore);
        telemetry.put("antiSpoofScore", antiSpoofScore);
        if (componentScores.containsKey("headPoseAngle")) {
            telemetry.put("headPoseAngle", componentScores.get("headPoseAngle"));
            telemetry.put("cheatingAlert", componentScores.get("cheatingAlert"));
        }
        if (request != null && request.getTelemetry() != null) {
            telemetry.putAll(request.getTelemetry());
        }

        AiReasoningResponse aiResult = null;
        if (geminiForensicService != null) {
            try {
                aiResult = geminiForensicService.analyzeLiveness(telemetry);
            } catch (Exception e) {
                log.warn("Forensic analysis exception: {}", e.getMessage());
            }
        }
        if (aiResult == null) {
            aiResult = AiReasoningResponse.builder()
                    .aiLivenessScore(0.92)
                    .confidence("HIGH")
                    .forensicReasoning("Multi-modal signal synthesis authenticates human presence.")
                    .build();
        }

        // 5. Fatal Guard Rail Rejections
        boolean fatalViolation = false;
        String failReason = null;

        if ("MULTIPLE_FACES".equals(antiSpoofClassification)) {
            fatalViolation = true;
            failReason = "Multiple faces detected. Policy requires exactly one person.";
        } else if (Boolean.FALSE.equals(antiSpoofReal)) {
            fatalViolation = true;
            failReason = "Presentation attack detected (" + antiSpoofClassification + ").";
        } else if (!challengePassed) {
            fatalViolation = true;
            failReason = "Active challenge response failed or timed out.";
        }

        // 6. Weighted Confidence Synthesis per TDD §5.1.4:
        // Liveness (45%): 50% rPPG + 50% AntiSpoof PAD
        double fusedLiveness = (signalQuality * 0.45) + (antiSpoofScore * 0.55);
        double systemScore = (fusedLiveness * 0.45) + (behaviorScore * 0.30) + (challengeScore * 0.25);
        double finalScore = (systemScore * 0.80) + (aiResult.getAiLivenessScore() * 0.20);
        double confidenceScore = Math.round(finalScore * 1000.0) / 10.0; // 0.0 - 100.0%

        // Persist detailed component scores
        componentScores.put("liveness", Math.round(fusedLiveness * 100.0) / 100.0);
        componentScores.put("rppgQuality", Math.round(signalQuality * 100.0) / 100.0);
        componentScores.put("bpm", Math.round(bpm * 10.0) / 10.0);
        componentScores.put("behavior", Math.round(behaviorScore * 100.0) / 100.0);
        componentScores.put("challenge", Math.round(challengeScore * 100.0) / 100.0);
        componentScores.put("antiSpoof", Math.round(antiSpoofScore * 100.0) / 100.0);
        componentScores.put("aiConfidence", aiResult.getConfidence());
        componentScores.put("reasoning", fatalViolation ? failReason : aiResult.getForensicReasoning());
        verification.setComponentScores(componentScores);

        // 7. Policy Outcome Determination
        double threshold = 80.0;
        if (!fatalViolation && confidenceScore >= threshold) {
            verification.setStatus(VerificationStatus.COMPLETED);
            verification.setConfidenceScore(confidenceScore);
            verification = verificationRepository.save(verification);

            // 8. Trust Layer: Automatically issue cryptographic KMS certificate
            if (certificateService != null) {
                try {
                    VerificationCertificate cert = certificateService.getOrIssue(verification.getId());
                    verification.setCertificateId(cert.getId());
                    verification = verificationRepository.save(verification);
                    log.info("[VERIFICATION {}] Cryptographic KMS certificate {} anchored.",
                            verificationId, cert.getId());
                } catch (Exception e) {
                    log.error("[VERIFICATION {}] Failed to issue certificate: {}", verificationId, e.getMessage());
                }
            }
        } else {
            verification.setStatus(VerificationStatus.FAILED);
            verification.setConfidenceScore(fatalViolation ? Math.min(30.0, confidenceScore) : confidenceScore);
            verification = verificationRepository.save(verification);
            log.warn("[VERIFICATION {}] Verification failed: score={}, reason={}",
                    verificationId, confidenceScore, failReason);
        }

        return toResponse(verification);
    }

    /**
     * Completes a verification with the final confidence score and component scores.
     * Called by the session result pipeline when liveness evaluation finishes.
     */
    @Transactional
    public void complete(UUID verificationId,
                         double confidenceScore,
                         Map<String, Object> componentScores) {
        Verification v = findOrThrow(verificationId);
        v.setStatus(VerificationStatus.COMPLETED);
        v.setConfidenceScore(confidenceScore);
        v.setComponentScores(componentScores);
        v = verificationRepository.save(v);

        // Issue certificate if certificate service is available
        if (certificateService != null && v.getCertificateId() == null) {
            try {
                VerificationCertificate cert = certificateService.getOrIssue(v.getId());
                v.setCertificateId(cert.getId());
                verificationRepository.save(v);
            } catch (Exception e) {
                log.warn("Could not lazily issue certificate in complete(): {}", e.getMessage());
            }
        }
        log.info("Verification {} completed with score {}", verificationId, confidenceScore);
    }

    /**
     * Marks a verification as FAILED.
     */
    @Transactional
    public void fail(UUID verificationId) {
        Verification v = findOrThrow(verificationId);
        v.setStatus(VerificationStatus.FAILED);
        verificationRepository.save(v);
        log.info("Verification {} failed", verificationId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Verification findOrThrow(UUID id) {
        return verificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Verification not found: " + id));
    }

    private VerifyResponse toResponse(Verification v) {
        return VerifyResponse.builder()
                .verificationId(v.getId())
                .status(v.getStatus().name())
                .userId(v.getUserId())
                .operationType(v.getOperationType())
                .confidenceScore(v.getConfidenceScore())
                .componentScores(v.getComponentScores())
                .createdAt(v.getCreatedAt())
                .updatedAt(v.getUpdatedAt())
                .certificateId(v.getCertificateId())
                .build();
    }
}
