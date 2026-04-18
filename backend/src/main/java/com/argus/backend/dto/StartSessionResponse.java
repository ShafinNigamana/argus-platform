package com.argus.backend.dto;

import lombok.Data;

/**
 * Data Transfer Object for the start session API response.
 */
@Data
public class StartSessionResponse {
    private String sessionId;
    private String status;
    private long expiresIn;
}
