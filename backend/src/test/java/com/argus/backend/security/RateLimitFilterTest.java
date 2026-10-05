package com.argus.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    private RateLimitFilter rateLimitFilter;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        // Configure with 5 requests per minute for testing
        rateLimitFilter = new RateLimitFilter(5, objectMapper);
    }

    @Test
    void requestsWithinLimit_PassThrough() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/verify");
            request.setRemoteAddr("192.168.1.100");
            MockHttpServletResponse response = new MockHttpServletResponse();

            rateLimitFilter.doFilter(request, response, filterChain);
            assertEquals(200, response.getStatus());
        }

        verify(filterChain, times(5)).doFilter(any(), any());
    }

    @Test
    void requestsExceedingLimit_Returns429TooManyRequests() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);

        // Exhaust the 5 tokens
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/verify");
            request.setRemoteAddr("10.0.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            rateLimitFilter.doFilter(request, response, filterChain);
        }

        // 6th request must be rejected with 429
        MockHttpServletRequest rejectedRequest = new MockHttpServletRequest("GET", "/api/v1/verify");
        rejectedRequest.setRemoteAddr("10.0.0.1");
        MockHttpServletResponse rejectedResponse = new MockHttpServletResponse();

        rateLimitFilter.doFilter(rejectedRequest, rejectedResponse, filterChain);

        assertEquals(429, rejectedResponse.getStatus());
        assertNotNull(rejectedResponse.getHeader("Retry-After"));
        assertTrue(rejectedResponse.getContentAsString().contains("RATE_LIMIT_EXCEEDED"));
    }

    @Test
    void healthEndpoint_SkipsRateLimiting() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }
}
