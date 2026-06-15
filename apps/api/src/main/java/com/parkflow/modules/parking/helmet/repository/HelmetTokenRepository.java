package com.parkflow.modules.parking.helmet.repository;

import com.parkflow.modules.parking.helmet.domain.HelmetToken;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HelmetTokenRepository extends JpaRepository<HelmetToken, UUID> {
  List<HelmetToken> findByCompanyIdOrderByCodeAsc(UUID companyId);
  List<HelmetToken> findByCompanyIdAndIsActiveTrueOrderByCodeAsc(UUID companyId);
  Optional<HelmetToken> findByIdAndCompanyId(UUID id, UUID companyId);
  boolean existsByCompanyIdAndCode(UUID companyId, String code);
}
