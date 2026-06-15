package com.parkflow.modules.parking.helmet.domain.repository;

import com.parkflow.modules.parking.helmet.domain.HelmetToken;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HelmetTokenPort {
  List<HelmetToken> findByCompanyId(UUID companyId);
  List<HelmetToken> findActiveByCompanyId(UUID companyId);
  Optional<HelmetToken> findByIdAndCompanyId(UUID id, UUID companyId);
  HelmetToken save(HelmetToken token);
  void delete(HelmetToken token);
  boolean existsByCompanyIdAndCode(UUID companyId, String code);
}
