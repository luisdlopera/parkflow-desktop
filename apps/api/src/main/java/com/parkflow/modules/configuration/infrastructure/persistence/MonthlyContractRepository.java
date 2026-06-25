package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.MonthlyContract;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MonthlyContractRepository extends JpaRepository<MonthlyContract, UUID> {

  @Query(
      "SELECT mc FROM MonthlyContract mc JOIN mc.vehicle v WHERE "
          + "(:site IS NULL OR :site = '' OR mc.site = :site) "
          + "AND (:plate IS NULL OR :plate = '' OR UPPER(v.plate) LIKE UPPER(CONCAT('%', :plate, '%'))) "
          + "AND (:active IS NULL OR (mc.status = com.parkflow.modules.configuration.domain.ContractStatus.ACTIVE AND :active = true) OR (mc.status != com.parkflow.modules.configuration.domain.ContractStatus.ACTIVE AND :active = false))")
  Page<MonthlyContract> search(
      @Param("site") String site,
      @Param("plate") String plate,
      @Param("active") Boolean active,
      Pageable pageable);

  /** Busca mensualidades activas vigentes para una placa en una fecha dada. */
  @Query(
      "SELECT mc FROM MonthlyContract mc JOIN mc.vehicle v WHERE v.plate = :plate AND mc.status = com.parkflow.modules.configuration.domain.ContractStatus.ACTIVE "
          + "AND mc.startDate <= :date AND mc.endDate >= :date")
  List<MonthlyContract> findActiveForPlateAndDate(
      @Param("plate") String plate, @Param("date") LocalDate date);

  @Query("SELECT mc FROM MonthlyContract mc JOIN mc.vehicle v WHERE v.plate = :plate AND mc.status = com.parkflow.modules.configuration.domain.ContractStatus.ACTIVE AND mc.startDate <= :dateEnd AND mc.endDate >= :dateStart")
  Optional<MonthlyContract> findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
      @Param("plate") String plate, @Param("dateStart") LocalDate dateStart, @Param("dateEnd") LocalDate dateEnd);
}
