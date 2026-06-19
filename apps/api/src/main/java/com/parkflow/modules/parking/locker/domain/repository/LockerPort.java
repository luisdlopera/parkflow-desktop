package com.parkflow.modules.parking.locker.domain.repository;

import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LockerPort {
  List<Locker> findByCompanyId(UUID companyId);
  List<Locker> findActiveByCompanyId(UUID companyId);
  Optional<Locker> findByIdAndCompanyId(UUID id, UUID companyId);
  Optional<Locker> findByCompanyIdAndCode(UUID companyId, String code);
  Locker save(Locker locker);
  void delete(Locker locker);
  boolean existsByCompanyIdAndCode(UUID companyId, String code);
  long countByCompanyIdAndStatus(UUID companyId, LockerStatus status);
}
