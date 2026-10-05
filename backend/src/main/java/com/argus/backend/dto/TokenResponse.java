package com.argus.backend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Response body for successful authentication and token refresh.
 * Returned by POST /api/v1/auth/login and POST /api/v1/auth/refresh.
 */
@Data
@Builder
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    /** Token type is always "Bearer" per RFC 6750. */
    @Builder.Default
    private String tokenType = "Bearer";
    /** Access token lifetime in seconds (3600 = 1 hour). */
    private long   expiresIn;
    private String username;
    private String role;
}
