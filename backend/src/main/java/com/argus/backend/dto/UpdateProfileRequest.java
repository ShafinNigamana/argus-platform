package com.argus.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating user profile and organization metadata.
 * Note: Role, username, and password changes are strictly forbidden through this endpoint.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @Size(max = 150, message = "Full name must be at most 150 characters")
    private String fullName;

    @Size(max = 255, message = "Organization name must be at most 255 characters")
    private String organizationName;

    @Size(max = 100, message = "Organization type must be at most 100 characters")
    private String organizationType;

    @Size(max = 255, message = "Organization website must be at most 255 characters")
    private String organizationWebsite;

    @Size(max = 100, message = "Industry must be at most 100 characters")
    private String industry;

    @Size(max = 50, message = "Team size must be at most 50 characters")
    private String teamSize;

    @Size(max = 150, message = "Job title must be at most 150 characters")
    private String jobTitle;
}
