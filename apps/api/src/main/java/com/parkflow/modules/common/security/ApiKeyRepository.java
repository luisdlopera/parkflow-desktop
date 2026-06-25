package com.parkflow.modules.common.security;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * API Key Repository
 *
 * Provides database access for API keys.
 */
@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {
  /**
   * Find an active API key by its hash
   */
  Optional<ApiKey> findByKeyHashAndIsActiveTrue(String keyHash);

  /**
   * Find all active API keys for a company
   */
  List<ApiKey> findByCompanyIdAndIsActiveTrue(UUID companyId);

  /**
   * Find all API keys for a company (including inactive)
   */
  List<ApiKey> findByCompanyId(UUID companyId);

  /**
   * Check if a key exists
   */
  boolean existsByKeyHashAndIsActiveTrue(String keyHash);
}
