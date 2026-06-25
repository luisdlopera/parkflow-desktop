package com.parkflow.modules.customers.infrastructure.persistence;

import com.parkflow.modules.customers.domain.Client;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
  Optional<Client> findByCompanyIdAndId(UUID companyId, UUID id);

  @Query("SELECT c FROM Client c WHERE c.companyId = :companyId AND " +
         "(:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
         "LOWER(c.document) LIKE LOWER(CONCAT('%', :search, '%')))")
  Page<Client> search(UUID companyId, String search, Pageable pageable);

  Optional<Client> findFirstByCompanyIdAndDocument(UUID companyId, String document);
  Optional<Client> findFirstByCompanyIdAndNameIgnoreCase(UUID companyId, String name);
}
