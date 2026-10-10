package com.argus.backend.repository;

import com.argus.backend.entity.AuthRateLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuthRateLimitRepository extends JpaRepository<AuthRateLimit, UUID> {
    Optional<AuthRateLimit> findByRateKeyAndActionType(String rateKey, String actionType);
    void deleteByLastAttemptAtBefore(Instant cutoff);
}
