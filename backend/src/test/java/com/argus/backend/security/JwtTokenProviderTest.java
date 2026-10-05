package com.argus.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    // 256-bit Base64-encoded secret
    private static final String TEST_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(TEST_SECRET);
    }

    @Test
    void generateAndValidateAccessToken_Success() {
        String token = jwtTokenProvider.generateAccessToken("testuser", "USER");
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("testuser", jwtTokenProvider.getUsernameFromToken(token));
        assertEquals("USER", jwtTokenProvider.getRoleFromToken(token));
    }

    @Test
    void generateAndValidateRefreshToken_Success() {
        String refreshToken = jwtTokenProvider.generateRefreshToken("adminuser");
        assertNotNull(refreshToken);
        assertTrue(jwtTokenProvider.validateToken(refreshToken));
        assertEquals("adminuser", jwtTokenProvider.getUsernameFromToken(refreshToken));
        assertNull(jwtTokenProvider.getRoleFromToken(refreshToken)); // refresh token has no role claim
    }

    @Test
    void validateToken_TamperedToken_ReturnsFalse() {
        String token = jwtTokenProvider.generateAccessToken("testuser", "USER");
        String tampered = token.substring(0, token.length() - 5) + "abcde";
        assertFalse(jwtTokenProvider.validateToken(tampered));
    }

    @Test
    void validateToken_MalformedToken_ReturnsFalse() {
        assertFalse(jwtTokenProvider.validateToken("not-a-valid-jwt"));
    }
}
