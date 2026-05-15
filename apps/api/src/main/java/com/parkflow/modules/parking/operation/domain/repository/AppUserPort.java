package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface AppUserPort {
  Optional<AppUser> findGlobalByEmail(String email);
  Optional<AppUser> findByEmailAndCompanyId(String email, UUID companyId);
  Optional<AppUser> findByEmailIgnoreCaseAndCompanyId(String email, UUID companyId);
  long countByRoleAndCompanyIdAndIsActiveTrue(UserRole role, UUID companyId);
  Page<AppUser> search(String q, Boolean active, UUID companyId, Pageable pageable);
  boolean existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(String document, UUID companyId, UUID id);
  boolean existsByDocumentIgnoreCaseAndCompanyId(String document, UUID companyId);
  AppUser save(AppUser user);
  Optional<AppUser> findById(UUID id);
  void delete(AppUser user);
}
