package com.argus.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when certificate issuance, retrieval, or validation fails.
 */
public class CertificateException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public CertificateException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.errorCode = "CERTIFICATE_ERROR";
    }

    public CertificateException(HttpStatus status, String errorCode, String message) {
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
