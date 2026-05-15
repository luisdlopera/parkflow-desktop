package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AppUserJpaAdapter implements AppUserPort {

  private final AppUserJpaRepository jpaRepository;

  @Override
  public Optional<AppUser> findGlobalByEmail(String email) {
    return jpaRepository.findGlobalByEmail(email);
  }

  @Override
  public Optional<AppUser> findByEmailAndCompanyId(String email, UUID companyId) {
    return jpaRepository.findByEmailAndCompanyId(email, companyId);
  }

  @Override
  public Optional<AppUser> findByEmailIgnoreCaseAndCompanyId(String email, UUID companyId) {
    return jpaRepository.findByEmailIgnoreCaseAndCompanyId(email, companyId);
  }

  @Override
  public long countByRoleAndCompanyIdAndIsActiveTrue(UserRole role, UUID companyId) {
    return jpaRepository.countByRoleAndCompanyIdAndIsActiveTrue(role, companyId);
  }

  @Override
  public Page<AppUser> search(String q, Boolean active, UUID companyId, Pageable pageable) {
    return jpaRepository.search(q, active, companyId, pageable);
  }

  @Override
  public boolean existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(String document, UUID companyId, UUID id) {
    return jpaRepository.existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(document, companyId, id);
  }

  @Override
  public boolean existsByDocumentIgnoreCaseAndCompanyId(String document, UUID companyId) {
    return jpaRepository.existsByDocumentIgnoreCaseAndCompanyId(document, companyId);
  }

  @Override
  public AppUser save(AppUser user) {
    return jpaRepository.save(user);
  }

  @Override
  public Optional<AppUser> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public void delete(AppUser user) {
    jpaRepository.delete(user);
  }

  @Repository
  interface AppUserJpaRepository extends JpaRepository<AppUser, UUID> {
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
}
