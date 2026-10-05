package com.argus.backend.repository;

import com.argus.backend.entity.AuditLog;
import com.argus.backend.entity.Verification;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class VerificationRepositoryTest {

    @Autowired
    private VerificationRepository verificationRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void saveAndFindVerification_Success() {
        Verification verification = Verification.builder()
                .userId("usr_abc123")
                .operationType("TRANSACTION")
                .status(Verification.VerificationStatus.INITIATED)
                .metadata(Map.of("client", "web"))
                .build();

        Verification saved = verificationRepository.save(verification);
        assertNotNull(saved.getId());

        Optional<Verification> found = verificationRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("usr_abc123", found.get().getUserId());
        assertEquals(Verification.VerificationStatus.INITIATED, found.get().getStatus());
    }

    @Test
    void saveAuditLog_ImmutableTrail_Success() {
        AuditLog log = AuditLog.builder()
                .eventType("VERIFICATION_INITIATED")
                .userId("usr_abc123")
                .resourceId("res_999")
                .resourceType("VERIFICATION")
                .actionDetails("Initiated test verification")
                .ipAddress("127.0.0.1")
                .build();

        AuditLog saved = auditLogRepository.save(log);
        assertNotNull(saved.getId());
        assertTrue(saved.isImmutable());

        List<AuditLog> logs = auditLogRepository.findByUserIdOrderByCreatedAtDesc("usr_abc123");
        assertFalse(logs.isEmpty());
        assertEquals("VERIFICATION_INITIATED", logs.get(0).getEventType());
    }
}
