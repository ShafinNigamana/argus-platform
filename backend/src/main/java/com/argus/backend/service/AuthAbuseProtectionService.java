package com.argus.backend.service;

import com.argus.backend.entity.AuthRateLimit;
import com.argus.backend.repository.AuthRateLimitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Multi-instance resilient abuse protection service for public authentication endpoints.
 *
 * <p>Persists failed attempts and lockouts to the shared relational database (PostgreSQL in prod,
 * H2 in embedded test suites) so that horizontal replicas (e.g. Cloud Run, Kubernetes pods)
 * share exact lockout state. Provides atomic in-memory fallback for high-throughput fault tolerance.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthAbuseProtectionService {

    private final AuthRateLimitRepository rateLimitRepository;

    private static final int MAX_FAILED_LOGINS = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    private static final Duration LOGIN_LOCKOUT = Duration.ofMinutes(15);

    private static final int MAX_REGISTRATIONS_PER_HOUR = 5;
    private static final Duration REGISTRATION_WINDOW = Duration.ofHours(1);
    private static final Duration REGISTRATION_LOCKOUT = Duration.ofHours(1);

    // In-memory fallback tracker if database write experiences transient failure
    private final ConcurrentHashMap<String, AtomicInteger> fallbackAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> fallbackBlocks = new ConcurrentHashMap<>();

    /**
     * Asserts that neither the client IP nor the target username is currently blocked from logging in.
     *
     * @param clientIp remote client IP
     * @param username attempted username
     * @throws ResponseStatusException HTTP 429 if rate limit / lockout threshold is exceeded
     */
    @Transactional(readOnly = true)
    public void checkLoginAllowed(String clientIp, String username) {
        checkBlockedKey("ip:" + sanitize(clientIp), "LOGIN", LOGIN_LOCKOUT);
        if (username != null && !username.isBlank()) {
            checkBlockedKey("user:" + sanitize(username), "LOGIN", LOGIN_LOCKOUT);
        }
    }

    /**
     * Records a failed login attempt against both the source IP and target username.
     */
    @Transactional
    public void recordFailedLogin(String clientIp, String username) {
        incrementAttempt("ip:" + sanitize(clientIp), "LOGIN", MAX_FAILED_LOGINS, LOGIN_WINDOW, LOGIN_LOCKOUT);
        if (username != null && !username.isBlank()) {
            incrementAttempt("user:" + sanitize(username), "LOGIN", MAX_FAILED_LOGINS, LOGIN_WINDOW, LOGIN_LOCKOUT);
        }
    }

    /**
     * Resets failed login attempt counts upon successful credential validation.
     */
    @Transactional
    public void recordSuccessfulLogin(String clientIp, String username) {
        resetKey("ip:" + sanitize(clientIp), "LOGIN");
        if (username != null && !username.isBlank()) {
            resetKey("user:" + sanitize(username), "LOGIN");
        }
    }

    /**
     * Asserts that the client IP has not exceeded the registration rate limit.
     */
    @Transactional(readOnly = true)
    public void checkRegistrationAllowed(String clientIp) {
        checkBlockedKey("ip:" + sanitize(clientIp), "REGISTER", REGISTRATION_LOCKOUT);
    }

    /**
     * Records a registration attempt against the source IP.
     */
    @Transactional
    public void recordRegistrationAttempt(String clientIp) {
        incrementAttempt("ip:" + sanitize(clientIp), "REGISTER", MAX_REGISTRATIONS_PER_HOUR, REGISTRATION_WINDOW, REGISTRATION_LOCKOUT);
    }

    private void checkBlockedKey(String rateKey, String actionType, Duration lockoutDuration) {
        Instant now = Instant.now();

        // 1. Check in-memory fallback lockout
        Instant fallbackUntil = fallbackBlocks.get(rateKey + ":" + actionType);
        if (fallbackUntil != null && fallbackUntil.isAfter(now)) {
            long retryAfterSeconds = Duration.between(now, fallbackUntil).getSeconds() + 1;
            throw rateLimitException(actionType, retryAfterSeconds);
        }

        // 2. Check persistent database state
        try {
            Optional<AuthRateLimit> recordOpt = rateLimitRepository.findByRateKeyAndActionType(rateKey, actionType);
            if (recordOpt.isPresent()) {
                AuthRateLimit record = recordOpt.get();
                if (record.getBlockedUntil() != null && record.getBlockedUntil().isAfter(now)) {
                    long retryAfterSeconds = Duration.between(now, record.getBlockedUntil()).getSeconds() + 1;
                    throw rateLimitException(actionType, retryAfterSeconds);
                }
            }
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.warn("Database lookup failed for auth rate limit key '{}': {}", rateKey, e.getMessage());
        }
    }

    private void incrementAttempt(String rateKey, String actionType, int maxAttempts, Duration window, Duration lockout) {
        Instant now = Instant.now();

        // Update in-memory fallback
        String fallbackKey = rateKey + ":" + actionType;
        int localAttempts = fallbackAttempts.computeIfAbsent(fallbackKey, k -> new AtomicInteger(0)).incrementAndGet();
        if (localAttempts >= maxAttempts) {
            fallbackBlocks.put(fallbackKey, now.plus(lockout));
        }

        // Update persistent store
        try {
            Optional<AuthRateLimit> recordOpt = rateLimitRepository.findByRateKeyAndActionType(rateKey, actionType);
            if (recordOpt.isPresent()) {
                AuthRateLimit record = recordOpt.get();
                if (record.getLastAttemptAt().isBefore(now.minus(window))) {
                    record.setAttempts(1);
                    record.setFirstAttemptAt(now);
                    record.setBlockedUntil(null);
                } else {
                    record.setAttempts(record.getAttempts() + 1);
                }
                record.setLastAttemptAt(now);

                if (record.getAttempts() >= maxAttempts) {
                    record.setBlockedUntil(now.plus(lockout));
                    log.warn("Rate limit exceeded for key '{}' action '{}'. Blocked until {}", rateKey, actionType, record.getBlockedUntil());
                }
                rateLimitRepository.save(record);
            } else {
                AuthRateLimit newRecord = AuthRateLimit.builder()
                        .rateKey(rateKey)
                        .actionType(actionType)
                        .attempts(1)
                        .firstAttemptAt(now)
                        .lastAttemptAt(now)
                        .blockedUntil(null)
                        .build();
                rateLimitRepository.save(newRecord);
            }
        } catch (Exception e) {
            log.warn("Database persist failed for auth rate limit key '{}': {}", rateKey, e.getMessage());
        }
    }

    private void resetKey(String rateKey, String actionType) {
        String fallbackKey = rateKey + ":" + actionType;
        fallbackAttempts.remove(fallbackKey);
        fallbackBlocks.remove(fallbackKey);

        try {
            rateLimitRepository.findByRateKeyAndActionType(rateKey, actionType).ifPresent(rateLimitRepository::delete);
        } catch (Exception e) {
            log.debug("Database delete failed for auth rate limit key '{}': {}", rateKey, e.getMessage());
        }
    }

    private ResponseStatusException rateLimitException(String actionType, long retryAfterSeconds) {
        return new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many " + actionType.toLowerCase() + " requests. Account/IP temporarily protected. Retry after " + retryAfterSeconds + " seconds."
        );
    }

    private String sanitize(String val) {
        return (val == null) ? "unknown" : val.trim().toLowerCase();
    }
}
