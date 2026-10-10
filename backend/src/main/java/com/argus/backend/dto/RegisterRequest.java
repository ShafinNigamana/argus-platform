package com.argus.backend.dto;

import com.argus.backend.entity.AppUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for POST /api/v1/auth/register.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

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

    /**
     * Ignored by server for security. Self-registration is strictly bound to Role.USER.
     */
    private AppUser.Role role;
}
