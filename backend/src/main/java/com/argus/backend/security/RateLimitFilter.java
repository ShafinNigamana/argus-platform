package com.argus.backend.security;

import com.argus.backend.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * In-memory rate limiting filter implementing the token-bucket algorithm per TDD §5.4.
 *
 * <p>Enforces a maximum of 100 requests per minute per authenticated user or client IP.
 * Exceeding the rate limit yields an HTTP 429 Too Many Requests response with a
 * standardized error payload and a {@code Retry-After} header.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final long requestsPerMinute;
    private final ObjectMapper objectMapper;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(
            @Value("${argus.rate-limiting.requests-per-minute:100}") long requestsPerMinute,
            ObjectMapper objectMapper) {
        this.requestsPerMinute = requestsPerMinute;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip rate limiting for health check and static root
        return "/actuator/health".equals(path) || "/".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String clientKey = resolveClientKey(request);
        Bucket bucket = buckets.computeIfAbsent(clientKey, k -> createBucket());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
        } else {
            long waitNanos = probe.getNanosToWaitForRefill();
            long retryAfterSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(waitNanos));

            log.warn("Rate limit exceeded for client: {}. Retry after {}s", clientKey, retryAfterSeconds);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));

            String reqId = request.getHeader("X-Request-ID");
            if (reqId == null || reqId.isBlank()) {
                reqId = UUID.randomUUID().toString();
            }

            ErrorResponse error = ErrorResponse.builder()
                    .status(HttpStatus.TOO_MANY_REQUESTS.value())
                    .errorCode("RATE_LIMIT_EXCEEDED")
                    .message("Rate limit exceeded. Maximum " + requestsPerMinute + " requests per minute allowed.")
                    .requestId(reqId)
                    .timestamp(System.currentTimeMillis())
                    .details(Map.of("retryAfterSeconds", retryAfterSeconds))
                    .build();

            objectMapper.writeValue(response.getWriter(), error);
        }
    }

    private Bucket createBucket() {
        Bandwidth limit = Bandwidth.classic(
                requestsPerMinute,
                Refill.greedy(requestsPerMinute, Duration.ofMinutes(1))
        );
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private String resolveClientKey(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return "user:" + auth.getName();
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return "ip:" + forwarded.split(",")[0].trim();
        }
        return "ip:" + request.getRemoteAddr();
    }
}
