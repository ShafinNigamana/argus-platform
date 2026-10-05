package com.argus.backend.exception;

import com.argus.backend.dto.ErrorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.addHeader("X-Request-ID", "test-request-id-123");
    }

    @Test
    void handleAccessDenied_Returns403() {
        AccessDeniedException ex = new AccessDeniedException("Access denied");
        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(ex, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ACCESS_DENIED", response.getBody().getErrorCode());
        assertEquals("test-request-id-123", response.getBody().getRequestId());
    }

    @Test
    void handleVerificationException_ReturnsConfiguredStatus() {
        VerificationException ex = new VerificationException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_STATE", "Invalid verification state");
        ResponseEntity<ErrorResponse> response = handler.handleVerificationException(ex, request);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INVALID_STATE", response.getBody().getErrorCode());
        assertEquals("Invalid verification state", response.getBody().getMessage());
    }

    @Test
    void handleRateLimitExceededException_Returns429WithHeader() {
        RateLimitExceededException ex = new RateLimitExceededException("Rate limit reached", 45);
        ResponseEntity<ErrorResponse> response = handler.handleRateLimitException(ex, request);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("45", response.getHeaders().getFirst("Retry-After"));
        assertNotNull(response.getBody());
        assertEquals("RATE_LIMIT_EXCEEDED", response.getBody().getErrorCode());
    }

    @Test
    void handleGenericException_Returns500InternalServerError() {
        Exception ex = new RuntimeException("Unexpected db crash");
        ResponseEntity<ErrorResponse> response = handler.handleGenericException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INTERNAL_SERVER_ERROR", response.getBody().getErrorCode());
        assertEquals("test-request-id-123", response.getBody().getRequestId());
    }
}
