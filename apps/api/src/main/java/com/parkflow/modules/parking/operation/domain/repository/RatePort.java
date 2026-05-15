package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RatePort {
  Page<Rate> search(String site, String q, Boolean active, RateCategory category, UUID companyId, Pageable pageable);
  default Page<Rate> search(String site, String q, Boolean active, RateCategory category, Pageable pageable) {
    return search(site, q, active, category, null, pageable);
  }
  List<Rate> findActiveForConflictCheck(String site, String vehicleType, UUID excludeId, UUID companyId);
  default List<Rate> findActiveForConflictCheck(String site, String vehicleType, UUID excludeId) {
    return findActiveForConflictCheck(site, vehicleType, excludeId, null);
  }
  Optional<Rate> findFirstApplicableRate(String site, String vehicleType, UUID companyId);
  boolean existsByNameAndIdNotAndCompanyId(String name, UUID excludeId, UUID companyId);
  Optional<Rate> findByIdAndCompanyId(UUID id, UUID companyId);
  Rate save(Rate rate);
  Optional<Rate> findById(UUID id);
  void delete(Rate rate);
}
