package com.parkflow.modules.customers.infrastructure.persistence;

import com.parkflow.modules.customers.domain.Client;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ClientJpaRepository extends JpaRepository<Client, UUID> {
  List<Client> findByCompanyId(UUID companyId);

  Optional<Client> findByDocumentAndCompanyId(String document, UUID companyId);

  boolean existsByIdAndCompanyId(UUID id, UUID companyId);

  @Query("SELECT COUNT(c) FROM Client c WHERE c.companyId = ?1 AND c.isActive = true")
  long countActiveByCompanyId(UUID companyId);

  Optional<Client> findFirstByCompanyIdAndDocument(UUID companyId, String document);
  Optional<Client> findFirstByCompanyIdAndNameIgnoreCase(UUID companyId, String name);
}
