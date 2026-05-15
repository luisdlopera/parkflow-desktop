package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.MonthlyContract;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MonthlyContractPort {
  Page<MonthlyContract> search(String site, String plate, Boolean active, UUID companyId, Pageable pageable);
  List<MonthlyContract> findActiveForPlateAndDate(String plate, LocalDate date, UUID companyId);
  Optional<MonthlyContract> findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
      String plate, LocalDate dateStart, LocalDate dateEnd, UUID companyId);
  MonthlyContract save(MonthlyContract contract);
  Optional<MonthlyContract> findById(UUID id);
}
