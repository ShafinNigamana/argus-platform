package com.argus.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request body for POST /api/v1/verify per TDD §4.1.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyRequest {

    /**
     * Opaque external user identifier. Argus does not manage end-user identities;
     * it verifies that the person performing the operation is physically present.
     * <p>
     * NOTE (Stage 1): As of security hardening, this field is accepted for API backwards-compatibility
     * but ignored during verification creation. Verification ownership is strictly bound
     * to the authenticated JWT principal.
     */
    @NotBlank(message = "userId is required")
    private String userId;

    /**
     * Operation type string, e.g. "HIGH_VALUE_TRANSACTION", "LOGIN", "PASSWORD_RESET".
     */
    @NotBlank(message = "operationType is required")
    private String operationType;

    /**
     * Optional client-supplied metadata (device info, IP address, transaction details).
     */
    private Map<String, Object> metadata;
}
