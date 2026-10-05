package com.argus.backend.controller;

import com.argus.backend.dto.CertificateResponse;
import com.argus.backend.dto.VerifyRequest;
import com.argus.backend.dto.VerifyResponse;
import com.argus.backend.entity.VerificationCertificate;
import com.argus.backend.service.AuditLogService;
import com.argus.backend.service.CertificateService;
import com.argus.backend.service.VerificationOrchestrator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for the core verification workflow.
 *
 * <p>Implements the TDD §4.1 contract:
 * <ul>
 *   <li>POST   /api/v1/verify                              — initiate verification</li>
 *   <li>GET    /api/v1/verify/{verificationId}              — poll status</li>
 *   <li>GET    /api/v1/verify/{verificationId}/certificate  — retrieve certificate</li>
 * </ul>
 *
 * <p>The legacy session-based pipeline endpoints remain in {@link SessionController}
 * for backward compatibility with the ML signal pipeline.
 */
@RestController
@RequestMapping("/api/v1/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationOrchestrator orchestrator;
    private final CertificateService       certificateService;
    private final AuditLogService          auditLogService;

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

        VerifyResponse response = orchestrator.initiate(request);

        auditLogService.log(
                AuditLogService.EVT_VERIFICATION_INITIATED,
                auth.getName(),
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
     * @return 200 with current status and scores, 404 if not found
     */
    @GetMapping("/{verificationId}")
    public ResponseEntity<VerifyResponse> getStatus(
            @PathVariable UUID verificationId) {

        VerifyResponse response = orchestrator.getStatus(verificationId);
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

        VerificationCertificate cert = certificateService.getOrIssue(verificationId);

        auditLogService.log(
                AuditLogService.EVT_CERTIFICATE_ISSUED,
                auth.getName(),
                cert.getId().toString(),
                "CERTIFICATE",
                "Certificate retrieved for verificationId=" + verificationId,
                httpRequest.getRemoteAddr()
        );

        CertificateResponse response = CertificateResponse.builder()
                .certificateId(cert.getId())
                .verificationId(cert.getVerificationId())
                .certificateData(cert.getCertificateData())
                .signature(cert.getSignature())
                .publicKey(cert.getPublicKey())
                .issuedAt(cert.getIssuedAt())
                .expiresAt(cert.getExpiresAt())
                .revoked(cert.isRevoked())
                .build();

        return ResponseEntity.ok(response);
    }
}
