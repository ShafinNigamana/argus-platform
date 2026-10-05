package com.argus.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when policy operations fail.
 */
public class PolicyException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public PolicyException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.errorCode = "POLICY_ERROR";
    }

    public PolicyException(HttpStatus status, String errorCode, String message) {
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
