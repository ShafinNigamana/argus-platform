package com.argus.backend.repository;

import com.argus.backend.entity.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Policy}.
 * TDD §2.4, §3.1.4.
 */
@Repository
public interface PolicyRepository extends JpaRepository<Policy, UUID> {

    List<Policy> findByActiveTrue();

    List<Policy> findByOrganisation(String organisation);
}
