package com.argus.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Standardized error response DTO for the API conforming to TDD §4.2.
 *
 * <p>All error responses include:
 * <ul>
 *   <li>HTTP status code</li>
 *   <li>Error code for programmatic handling</li>
 *   <li>User-friendly message</li>
 *   <li>Request ID for traceability and debugging</li>
 *   <li>Timestamp of occurrence</li>
 *   <li>Optional structured details object</li>
 * </ul>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private int status;
    private String errorCode;
    private String message;
    private String requestId;
    private long timestamp;
    private Object details;

    public ErrorResponse(int status, String errorCode, String message) {
        this.status = status;
        this.errorCode = errorCode;
        this.message = message;
        this.timestamp = System.currentTimeMillis();
    }

    public ErrorResponse(int status, String errorCode, String message, String requestId) {
        this.status = status;
        this.errorCode = errorCode;
        this.message = message;
        this.requestId = requestId;
        this.timestamp = System.currentTimeMillis();
    }

    public ErrorResponse(int status, String errorCode, String message, String requestId, Object details) {
        this.status = status;
        this.errorCode = errorCode;
        this.message = message;
        this.requestId = requestId;
        this.details = details;
        this.timestamp = System.currentTimeMillis();
    }

    /** Compatibility getter for legacy callers expecting 'error'. */
    public String getError() {
        return errorCode;
    }
}
