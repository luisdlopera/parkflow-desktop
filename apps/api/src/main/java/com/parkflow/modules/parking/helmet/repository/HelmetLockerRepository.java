package com.parkflow.modules.parking.helmet.repository;

import com.parkflow.modules.parking.helmet.domain.HelmetLocker;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HelmetLockerRepository extends JpaRepository<HelmetLocker, UUID> {
  List<HelmetLocker> findByCompanyIdOrderByCodeAsc(UUID companyId);
  List<HelmetLocker> findByCompanyIdAndIsActiveTrueOrderByCodeAsc(UUID companyId);
  Optional<HelmetLocker> findByIdAndCompanyId(UUID id, UUID companyId);
  boolean existsByCompanyIdAndCode(UUID companyId, String code);
}
