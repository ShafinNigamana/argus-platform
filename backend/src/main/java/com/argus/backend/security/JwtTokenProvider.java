package com.argus.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;

/**
 * JWT token provider for Argus Platform.
 *
 * <p>Issues and validates JWT tokens using HS256 algorithm with a secret key
 * stored in an environment variable (never hard-coded). In production the secret
 * is injected via Google Cloud Secret Manager. TDD §5.1.
 *
 * <p>Token types:
 * <ul>
 *   <li>Access token: 1 hour expiry</li>
 *   <li>Refresh token: 7 days expiry</li>
 * </ul>
 */
@Slf4j
@Component
public class JwtTokenProvider {

    /** Access token lifetime: 1 hour per TDD §5.1. */
    private static final long ACCESS_TOKEN_EXPIRY_MS  = 60L * 60 * 1000;
    /** Refresh token lifetime: 7 days per TDD §5.1. */
    private static final long REFRESH_TOKEN_EXPIRY_MS = 7L * 24 * 60 * 60 * 1000;

    private final SecretKey signingKey;

    /**
     * @param jwtSecret Base64-encoded secret, minimum 256 bits for HS256.
     *                  Provided via environment variable JWT_SECRET; never hard-coded.
     */
    public JwtTokenProvider(@Value("${argus.jwt.secret}") String jwtSecret) {
        // Keys.hmacShaKeyFor validates minimum key size for HS256 at startup.
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    /**
     * Issues a short-lived access token.
     *
     * @param username the authenticated user's username (becomes JWT subject)
     * @param role     the user's RBAC role (stored as a claim)
     * @return signed JWT string
     */
    public String generateAccessToken(String username, String role) {
        return buildToken(username, role, ACCESS_TOKEN_EXPIRY_MS);
    }

    /**
     * Issues a long-lived refresh token. Only contains subject; no role claim.
     * Roles are re-fetched from DB on refresh to pick up any role changes.
     *
     * @param username the authenticated user's username
     * @return signed JWT string
     */
    public String generateRefreshToken(String username) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(username)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(REFRESH_TOKEN_EXPIRY_MS)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Extracts the username (subject) from a token without throwing on expiry.
     *
     * @param token raw JWT string
     * @return username, or null if token cannot be parsed
     */
    public String getUsernameFromToken(String token) {
        try {
            return parseClaims(token).getSubject();
        } catch (JwtException e) {
            log.debug("Could not extract username from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts the user role from a token claim.
     *
     * @param token raw JWT string
     * @return role string (e.g. "USER", "ADMIN"), or null if absent or invalid
     */
    public String getRoleFromToken(String token) {
        try {
            return parseClaims(token).get("role", String.class);
        } catch (JwtException e) {
            log.debug("Could not extract role from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Validates a JWT token — verifies signature and expiry.
     *
     * @param token raw JWT string
     * @return true if the token is valid and not expired
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.debug("JWT token expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("Unsupported JWT token: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("Malformed JWT token: {}", e.getMessage());
        } catch (JwtException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
        }
        return false;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String buildToken(String username, String role, long expiryMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expiryMs)))
                .signWith(signingKey)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
