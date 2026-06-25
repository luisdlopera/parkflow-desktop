package com.parkflow.modules.parking.locker.infrastructure.persistence;

import com.parkflow.modules.parking.locker.domain.Locker;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LockerRepository extends JpaRepository<Locker, UUID> {
  List<Locker> findByCompanyIdOrderByCodeAsc(UUID companyId);
  List<Locker> findByCompanyIdAndIsActiveTrueOrderByCodeAsc(UUID companyId);
  Optional<Locker> findByIdAndCompanyId(UUID id, UUID companyId);
  Optional<Locker> findByCompanyIdAndCode(UUID companyId, String code);
  boolean existsByCompanyIdAndCode(UUID companyId, String code);
  long countByCompanyIdAndStatus(UUID companyId, com.parkflow.modules.parking.locker.domain.LockerStatus status);
}
