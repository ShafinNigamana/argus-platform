package com.argus.backend.service;

import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.Verification;
import com.argus.backend.entity.Verification.VerificationStatus;
import com.argus.backend.repository.VerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Verification orchestrator — coordinates the verification workflow lifecycle.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Initiate a new verification (POST /api/v1/verify)</li>
 *   <li>Retrieve verification status (GET /api/v1/verify/{id})</li>
 *   <li>Update status and scores when the ML/signal pipeline produces results</li>
 * </ul>
 *
 * <p>Integration boundary: the signal processing engines (SignalProcessingEngine,
 * BehaviorValidationEngine, ChallengeValidationEngine, LivenessDecisionEngine) feed
 * results to this orchestrator via the existing session-based pipeline. The orchestrator
 * maps session results → Verification JPA entity. TDD §2.3.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationOrchestrator {

    private final VerificationRepository verificationRepository;

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
     * Marks a verification as IN_PROGRESS (called when signal pipeline starts processing).
     * Integration point: called from the existing FrameService / SessionService pipeline.
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
     * Completes a verification with the final confidence score and component scores.
     * Called by the session result pipeline when liveness evaluation finishes.
     *
     * @param verificationId   UUID of the verification
     * @param confidenceScore  overall score (0–100)
     * @param componentScores  per-component breakdown map
     */
    @Transactional
    public void complete(UUID verificationId,
                         double confidenceScore,
                         java.util.Map<String, Object> componentScores) {
        Verification v = findOrThrow(verificationId);
        v.setStatus(VerificationStatus.COMPLETED);
        v.setConfidenceScore(confidenceScore);
        v.setComponentScores(componentScores);
        verificationRepository.save(v);
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
