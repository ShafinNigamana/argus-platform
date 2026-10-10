package com.argus.backend.controller;

import com.argus.backend.dto.AntiSpoofResponse;
import com.argus.backend.dto.CertificateResponse;
import com.argus.backend.dto.PagedResponse;
import com.argus.backend.dto.VerificationCompleteRequest;
import com.argus.backend.dto.VerificationSummaryResponse;
import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.Verification;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.security.VerificationAccessGuard;
import com.argus.backend.service.AuditLogService;
import com.argus.backend.service.CertificateService;
import com.argus.backend.service.VerificationOrchestrator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * REST controller for the core verification workflow.
 *
 * <p>Implements the TDD §4.1 contract:
 * <ul>
 *   <li>POST   /api/v1/verify                              — initiate verification</li>
 *   <li>GET    /api/v1/verify/{verificationId}              — poll status</li>
 *   <li>POST   /api/v1/verify/{verificationId}/face         — submit face frame for ONNX anti-spoofing</li>
 *   <li>POST   /api/v1/verify/{verificationId}/complete     — multi-signal evaluation & decision</li>
 *   <li>GET    /api/v1/verify/{verificationId}/certificate  — retrieve certificate</li>
 *   <li>GET    /api/v1/verify/health-check                  — health check</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationOrchestrator orchestrator;
    private final CertificateService       certificateService;
    private final AuditLogService          auditLogService;
    private final VerificationAccessGuard  accessGuard;

    /**
     * System health check for frontend & edge verification probes.
     */
    @GetMapping("/health-check")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "backendOnline", true,
                "modelReady", true,
                "kmsTrustReady", true,
                "modelName", "MiniFASNetV2-SE + UltraFace Slim 320",
                "service", "Argus Verification Core"
        ));
    }

    /**
     * Lists verification history sessions conforming to Stage 2 + 3 specification.
     * <ul>
     *   <li>ROLE_USER: strictly limited to the authenticated principal's own records.</li>
     *   <li>ROLE_ADMIN / ROLE_SUPERADMIN: broader visibility, optionally filtered by userId.</li>
     * </ul>
     *
     * @param userId        optional user filter (honored only for ADMIN/SUPERADMIN; ignored for USER)
     * @param status        optional verification status filter (INITIATED, IN_PROGRESS, COMPLETED, FAILED)
     * @param operationType optional operation type filter
     * @param page          page number (0-indexed, default 0)
     * @param size          page size (default 20, max 100)
     * @param auth          authenticated principal
     * @return 200 with PagedResponse of VerificationSummaryResponse
     */
    @GetMapping
    public ResponseEntity<PagedResponse<VerificationSummaryResponse>> listVerifications(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) Verification.VerificationStatus status,
            @RequestParam(required = false) String operationType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {

        String effectiveUserId = accessGuard.resolveEffectiveUserIdForList(userId, auth);
        PagedResponse<VerificationSummaryResponse> response = orchestrator.listVerifications(
                effectiveUserId, status, operationType, page, size);

        return ResponseEntity.ok(response);
    }

    /**
     * Initiates a new verification workflow.
     *
     * @param request      verification parameters (userId, operationType, metadata)
     * @param auth         injected authenticated principal
     * @param httpRequest  used for IP address and requestId in audit
     * @return 200 with verificationId and INITIATED status
     */
    @PostMapping
    public ResponseEntity<VerifyResponse> initiate(
            @Valid @RequestBody VerifyRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        String principal = auth != null ? auth.getName() : null;
        if (principal != null && !principal.isBlank()) {
            if (request.getUserId() != null && !request.getUserId().equals(principal)) {
                log.warn("VerifyRequest userId '{}' differs from authenticated principal '{}'; using principal as owner",
                        request.getUserId(), principal);
            }
            request.setUserId(principal);
        }

        VerifyResponse response = orchestrator.initiate(request);

        auditLogService.log(
                AuditLogService.EVT_VERIFICATION_INITIATED,
                auth != null ? auth.getName() : request.getUserId(),
                response.getVerificationId().toString(),
                "VERIFICATION",
                "Verification initiated for userId=" + request.getUserId() +
                " operationType=" + request.getOperationType(),
                httpRequest.getRemoteAddr()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Polls the current status of a verification.
     *
     * @param verificationId UUID of the verification
     * @param auth           authenticated principal
     * @return 200 with current status and scores, 404 if not found, 403 if unauthorized
     */
    @GetMapping("/{verificationId}")
    public ResponseEntity<VerifyResponse> getStatus(
            @PathVariable UUID verificationId,
            Authentication auth) {

        accessGuard.checkReadAccess(verificationId, auth);
        VerifyResponse response = orchestrator.getStatus(verificationId);
        return ResponseEntity.ok(response);
    }

    /**
     * Submits a face image for ONNX presentation attack detection (PAD) evaluation
     * bound to a specific verification lifecycle.
     */
    @PostMapping("/{verificationId}/face")
    public ResponseEntity<AntiSpoofResponse> verifyFace(
            @PathVariable UUID verificationId,
            @RequestBody AntiSpoofController.FaceVerificationRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        accessGuard.checkMutateAccess(verificationId, auth);

        if (request == null || request.getImage() == null || request.getImage().isBlank()) {
            return ResponseEntity.badRequest().body(AntiSpoofResponse.builder()
                    .isReal(false)
                    .classification("MISSING_PAYLOAD")
                    .reasoning("Face image is required.")
                    .build());
        }

        AntiSpoofResponse response = orchestrator.verifyFace(verificationId, request.getImage());

        auditLogService.log(
                "FACE_ANTISPOOF_EVALUATED",
                auth != null ? auth.getName() : "user",
                verificationId.toString(),
                "VERIFICATION",
                "Face PAD evaluated: classification=" + response.getClassification() + " isReal=" + response.isReal(),
                httpRequest.getRemoteAddr()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Completes and evaluates verification by aggregating all signals:
     * rPPG + Behavior + Challenge + ONNX/PAD + AI reasoning.
     */
    @PostMapping("/{verificationId}/complete")
    public ResponseEntity<VerifyResponse> completeVerification(
            @PathVariable UUID verificationId,
            @RequestBody(required = false) VerificationCompleteRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        accessGuard.checkMutateAccess(verificationId, auth);

        VerifyResponse response = orchestrator.evaluateAndComplete(verificationId, request);

        auditLogService.log(
                "COMPLETED".equals(response.getStatus()) ? "VERIFICATION_SUCCESS" : "VERIFICATION_FAILED",
                auth != null ? auth.getName() : response.getUserId(),
                verificationId.toString(),
                "VERIFICATION",
                "Verification final verdict: " + response.getStatus() + " (Score: " + response.getConfidenceScore() + "%)",
                httpRequest.getRemoteAddr()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves (and lazily issues) the cryptographic certificate for a completed verification.
     *
     * @param verificationId UUID of the verification
     * @param auth           authenticated principal (logged for audit)
     * @param httpRequest    used for IP address in audit
     * @return 200 with certificate data and signature
     */
    @GetMapping("/{verificationId}/certificate")
    public ResponseEntity<CertificateResponse> getCertificate(
            @PathVariable UUID verificationId,
            Authentication auth,
            HttpServletRequest httpRequest) {

        accessGuard.checkReadAccess(verificationId, auth);

        VerificationCertificate cert = certificateService.getOrIssue(verificationId);

        auditLogService.log(
                AuditLogService.EVT_CERTIFICATE_ISSUED,
                auth != null ? auth.getName() : "user",
                cert.getId().toString(),
                "CERTIFICATE",
                "Certificate retrieved for verificationId=" + verificationId,
                httpRequest.getRemoteAddr()
        );

        String signingMode = (cert.getPublicKey() != null
                && !"ARGUS-PLATFORM-LOCAL-SHA256".equals(cert.getPublicKey())
                && cert.getPublicKey().contains("PUBLIC KEY"))
                ? "KMS_ASYMMETRIC"
                : "SHA256_FALLBACK";

        CertificateResponse response = CertificateResponse.builder()
                .certificateId(cert.getId())
                .verificationId(cert.getVerificationId())
                .certificateData(cert.getCertificateData())
                .signature(cert.getSignature())
                .publicKey(cert.getPublicKey())
                .signingMode(signingMode)
                .issuedAt(cert.getIssuedAt())
                .expiresAt(cert.getExpiresAt())
                .revoked(cert.isRevoked())
                .build();

        return ResponseEntity.ok(response);
    }
}
