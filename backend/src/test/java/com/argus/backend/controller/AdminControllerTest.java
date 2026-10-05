package com.argus.backend.controller;

import com.argus.backend.dto.PolicyRequest;
import com.argus.backend.entity.AuditLog;
import com.argus.backend.entity.Policy;
import com.argus.backend.repository.PolicyRepository;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PolicyRepository policyRepository;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    @WithMockUser(username = "regularUser", roles = {"USER"})
    void createPolicy_ForbiddenForRegularUser() throws Exception {
        PolicyRequest request = new PolicyRequest();
        request.setName("High Security");
        request.setConfidenceThreshold(85.0);
        request.setMaxDurationSeconds(90);

        mockMvc.perform(post("/api/v1/admin/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "adminUser", roles = {"ADMIN"})
    void createPolicy_AllowedForAdmin() throws Exception {
        PolicyRequest request = new PolicyRequest();
        request.setName("High Security");
        request.setConfidenceThreshold(85.0);
        request.setMaxDurationSeconds(90);

        Policy created = Policy.builder()
                .id(UUID.randomUUID())
                .name("High Security")
                .confidenceThreshold(85.0)
                .maxDurationSeconds(90)
                .active(true)
                .createdAt(Instant.now())
                .build();

        when(policyRepository.save(any(Policy.class))).thenReturn(created);

        mockMvc.perform(post("/api/v1/admin/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("High Security"))
                .andExpect(jsonPath("$.confidenceThreshold").value(85.0));
    }

    @Test
    @WithMockUser(username = "auditUser", roles = {"AUDIT"})
    void queryAuditLogs_AllowedForAuditRole() throws Exception {
        AuditLog log1 = AuditLog.builder()
                .id(UUID.randomUUID())
                .eventType("VERIFICATION_INITIATED")
                .userId("usr_123")
                .resourceType("VERIFICATION")
                .createdAt(Instant.now())
                .build();

        when(auditLogService.query(any(), any(), any(), any(Integer.class)))
                .thenReturn(List.of(log1));

        mockMvc.perform(get("/api/v1/admin/audit-logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("VERIFICATION_INITIATED"))
                .andExpect(jsonPath("$[0].userId").value("usr_123"));
    }
}
