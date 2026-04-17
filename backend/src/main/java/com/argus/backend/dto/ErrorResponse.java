package com.argus.backend.dto;

import lombok.Data;

/**
 * Standardized error response DTO for the API.
 */
@Data
public class ErrorResponse {
    private int status;
    private String error;
    private String message;
    private long timestamp;

    public ErrorResponse(int status, String error, String message) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.timestamp = System.currentTimeMillis();
    }
}
