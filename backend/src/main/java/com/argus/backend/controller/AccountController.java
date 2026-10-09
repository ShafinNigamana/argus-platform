package com.argus.backend.controller;

import com.argus.backend.dto.UpdateProfileRequest;
import com.argus.backend.dto.UserProfileResponse;
import com.argus.backend.entity.AppUser;
import com.argus.backend.repository.AppUserRepository;
import com.argus.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for account profile and organization metadata management.
 * Provides endpoints for authenticated users to inspect and update their own profile.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/account")
@RequiredArgsConstructor
public class AccountController {

    private final AppUserRepository userRepository;
    private final AuditLogService auditLogService;

    /**
     * Retrieves the authenticated user's profile and organization metadata.
     */
    @GetMapping
    public ResponseEntity<UserProfileResponse> getAccountProfile(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new AccessDeniedException("Authentication required to access account profile");
        }

        AppUser user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + auth.getName()));

        return ResponseEntity.ok(toResponse(user));
    }

    /**
     * Updates permitted profile and organization metadata fields for the authenticated user.
     * Roles, username, and email are immutable through this endpoint.
     */
    @PatchMapping
    public ResponseEntity<UserProfileResponse> updateAccountProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        if (auth == null || auth.getName() == null) {
            throw new AccessDeniedException("Authentication required to update account profile");
        }

        AppUser user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + auth.getName()));

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getOrganizationName() != null) {
            user.setOrganizationName(request.getOrganizationName().trim());
        }
        if (request.getOrganizationType() != null) {
            user.setOrganizationType(request.getOrganizationType().trim());
        }
        if (request.getOrganizationWebsite() != null) {
            user.setOrganizationWebsite(request.getOrganizationWebsite().trim());
        }
        if (request.getIndustry() != null) {
            user.setIndustry(request.getIndustry().trim());
        }
        if (request.getTeamSize() != null) {
            user.setTeamSize(request.getTeamSize().trim());
        }
        if (request.getJobTitle() != null) {
            user.setJobTitle(request.getJobTitle().trim());
        }

        user = userRepository.save(user);

        auditLogService.log(
                "ACCOUNT_PROFILE_UPDATED",
                user.getUsername(),
                user.getId().toString(),
                "ACCOUNT",
                "User updated account profile metadata",
                httpRequest.getRemoteAddr()
        );

        return ResponseEntity.ok(toResponse(user));
    }

    private UserProfileResponse toResponse(AppUser user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .organizationName(user.getOrganizationName())
                .organizationType(user.getOrganizationType())
                .organizationWebsite(user.getOrganizationWebsite())
                .industry(user.getIndustry())
                .teamSize(user.getTeamSize())
                .jobTitle(user.getJobTitle())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
