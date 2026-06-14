package com.parkflow.modules.parking.helmet.domain.repository;

import com.parkflow.modules.parking.helmet.domain.HelmetLocker;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HelmetLockerPort {
  List<HelmetLocker> findByCompanyId(UUID companyId);
  List<HelmetLocker> findActiveByCompanyId(UUID companyId);
  Optional<HelmetLocker> findByIdAndCompanyId(UUID id, UUID companyId);
  HelmetLocker save(HelmetLocker locker);
  void delete(HelmetLocker locker);
  boolean existsByCompanyIdAndCode(UUID companyId, String code);
}
