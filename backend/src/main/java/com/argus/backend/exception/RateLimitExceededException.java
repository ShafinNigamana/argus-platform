package com.argus.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when a client exceeds the allowable rate limit per TDD §5.4.
 */
public class RateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public HttpStatus getStatus() {
        return HttpStatus.TOO_MANY_REQUESTS;
    }

    public String getErrorCode() {
        return "RATE_LIMIT_EXCEEDED";
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
