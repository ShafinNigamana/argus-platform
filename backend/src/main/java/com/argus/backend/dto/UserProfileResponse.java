package com.argus.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO returning account profile and organization metadata for the authenticated caller.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private UUID id;
    private String username;
    private String email;
    private String role;
    private String fullName;
    private String organizationName;
    private String organizationType;
    private String organizationWebsite;
    private String industry;
    private String teamSize;
    private String jobTitle;
    private boolean enabled;
    private Instant createdAt;
}
