package com.argus.backend.controller;

import com.argus.backend.dto.UpdateProfileRequest;
import com.argus.backend.entity.AppUser;
import com.argus.backend.repository.AppUserRepository;
import com.argus.backend.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AppUserRepository userRepository;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    void getAccountProfile_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/account"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "jdoe", roles = {"USER"})
    void getAccountProfile_Authenticated_ReturnsProfileWithOrganization() throws Exception {
        AppUser mockUser = AppUser.builder()
                .id(UUID.randomUUID())
                .username("jdoe")
                .email("jdoe@example.org")
                .fullName("John Doe")
                .organizationName("Acme Security Labs")
                .organizationType("COMPANY")
                .jobTitle("Security Engineer")
                .role(AppUser.Role.USER)
                .enabled(true)
                .build();

        when(userRepository.findByUsername("jdoe")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(get("/api/v1/account"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("jdoe"))
                .andExpect(jsonPath("$.email").value("jdoe@example.org"))
                .andExpect(jsonPath("$.fullName").value("John Doe"))
                .andExpect(jsonPath("$.organizationName").value("Acme Security Labs"))
                .andExpect(jsonPath("$.organizationType").value("COMPANY"))
                .andExpect(jsonPath("$.jobTitle").value("Security Engineer"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    @WithMockUser(username = "jdoe", roles = {"USER"})
    void updateAccountProfile_ValidUpdates_ReturnsUpdatedProfile() throws Exception {
        AppUser mockUser = AppUser.builder()
                .id(UUID.randomUUID())
                .username("jdoe")
                .email("jdoe@example.org")
                .fullName("John Doe")
                .organizationName("Acme Security Labs")
                .organizationType("COMPANY")
                .jobTitle("Security Engineer")
                .role(AppUser.Role.USER)
                .enabled(true)
                .build();

        when(userRepository.findByUsername("jdoe")).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("Johnathan Doe")
                .jobTitle("Lead Security Architect")
                .organizationWebsite("https://acme-labs.example.com")
                .build();

        mockMvc.perform(patch("/api/v1/account")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Johnathan Doe"))
                .andExpect(jsonPath("$.jobTitle").value("Lead Security Architect"))
                .andExpect(jsonPath("$.organizationWebsite").value("https://acme-labs.example.com"))
                .andExpect(jsonPath("$.role").value("USER")); // Role stays USER
    }
}
