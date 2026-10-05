package com.argus.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when verification workflow operations fail.
 */
public class VerificationException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public VerificationException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.errorCode = "VERIFICATION_ERROR";
    }

    public VerificationException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
