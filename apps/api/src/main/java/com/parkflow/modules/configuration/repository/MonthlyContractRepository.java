package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.MonthlyContract;
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
      "SELECT mc FROM MonthlyContract mc WHERE "
          + "(:site IS NULL OR :site = '' OR mc.site = :site) "
          + "AND (:plate IS NULL OR :plate = '' OR UPPER(mc.plate) LIKE UPPER(CONCAT('%', :plate, '%'))) "
          + "AND (:active IS NULL OR mc.isActive = :active)")
  Page<MonthlyContract> search(
      @Param("site") String site,
      @Param("plate") String plate,
      @Param("active") Boolean active,
      Pageable pageable);

  /** Busca mensualidades activas vigentes para una placa en una fecha dada. */
  @Query(
      "SELECT mc FROM MonthlyContract mc WHERE mc.plate = :plate AND mc.isActive = true "
          + "AND mc.startDate <= :date AND mc.endDate >= :date")
  List<MonthlyContract> findActiveForPlateAndDate(
      @Param("plate") String plate, @Param("date") LocalDate date);

  Optional<MonthlyContract> findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
      String plate, LocalDate dateStart, LocalDate dateEnd);
}
