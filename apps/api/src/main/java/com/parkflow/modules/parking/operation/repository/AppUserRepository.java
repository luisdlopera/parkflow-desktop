package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
  Optional<AppUser> findByEmail(String email);

  Optional<AppUser> findByEmailIgnoreCase(String email);

  long countByRoleAndIsActiveTrue(UserRole role);

  @Query(
      "SELECT u FROM AppUser u WHERE (:q IS NULL OR :q = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%')) "
          + "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(COALESCE(u.document, '')) LIKE LOWER(CONCAT('%', :q, '%'))) "
          + "AND (:active IS NULL OR u.isActive = :active)")
  Page<AppUser> search(
      @Param("q") String q, @Param("active") Boolean active, Pageable pageable);

  boolean existsByDocumentIgnoreCaseAndIdNot(String document, UUID id);

  boolean existsByDocumentIgnoreCase(String document);
}
