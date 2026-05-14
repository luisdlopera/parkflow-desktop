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
  @Query("SELECT u FROM AppUser u WHERE LOWER(u.email) = LOWER(:email)")
  Optional<AppUser> findGlobalByEmail(@Param("email") String email);

  Optional<AppUser> findByEmailAndCompanyId(String email, UUID companyId);

  Optional<AppUser> findByEmailIgnoreCaseAndCompanyId(String email, UUID companyId);

  long countByRoleAndCompanyIdAndIsActiveTrue(UserRole role, UUID companyId);

  @Query(
      "SELECT u FROM AppUser u WHERE u.companyId = :cid AND (:q IS NULL OR :q = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%')) "
          + "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(COALESCE(u.document, '')) LIKE LOWER(CONCAT('%', :q, '%'))) "
          + "AND (:active IS NULL OR u.isActive = :active)")
  Page<AppUser> search(
      @Param("q") String q, @Param("active") Boolean active, @Param("cid") UUID companyId, Pageable pageable);

  boolean existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(String document, UUID companyId, UUID id);

  boolean existsByDocumentIgnoreCaseAndCompanyId(String document, UUID companyId);
}
