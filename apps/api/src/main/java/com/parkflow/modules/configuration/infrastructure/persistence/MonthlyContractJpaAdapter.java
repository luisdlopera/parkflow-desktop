package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.MonthlyContract;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MonthlyContractJpaAdapter implements MonthlyContractPort {

  private final MonthlyContractJpaRepository jpaRepository;

  @Override
  public Page<MonthlyContract> search(String site, String plate, Boolean active, UUID companyId, Pageable pageable) {
    return jpaRepository.search(site, plate, active, companyId, pageable);
  }

  @Override
  public List<MonthlyContract> findActiveForPlateAndDate(String plate, LocalDate date, UUID companyId) {
    return jpaRepository.findActiveForPlateAndDate(plate, date, companyId);
  }

  @Override
  public Optional<MonthlyContract> findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
      String plate, LocalDate dateStart, LocalDate dateEnd, UUID companyId) {
    return jpaRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndCompanyId(
        plate, dateStart, dateEnd, companyId);
  }

  @Override
  public MonthlyContract save(MonthlyContract contract) {
    return jpaRepository.save(contract);
  }

  @Override
  public Optional<MonthlyContract> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface MonthlyContractJpaRepository extends JpaRepository<MonthlyContract, UUID> {
    @Query(
        "SELECT mc FROM MonthlyContract mc WHERE mc.companyId = :cid AND "
            + "(:site IS NULL OR :site = '' OR mc.site = :site) "
            + "AND (:plate IS NULL OR :plate = '' OR UPPER(mc.plate) LIKE UPPER(CONCAT('%', :plate, '%'))) "
            + "AND (:active IS NULL OR mc.isActive = :active)")
    Page<MonthlyContract> search(
        @Param("site") String site,
        @Param("plate") String plate,
        @Param("active") Boolean active,
        @Param("cid") UUID companyId,
        Pageable pageable);

    @Query(
        "SELECT mc FROM MonthlyContract mc WHERE mc.plate = :plate AND mc.companyId = :cid AND mc.isActive = true "
            + "AND mc.startDate <= :date AND mc.endDate >= :date")
    List<MonthlyContract> findActiveForPlateAndDate(
        @Param("plate") String plate, @Param("date") LocalDate date, @Param("cid") UUID companyId);

    Optional<MonthlyContract> findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndCompanyId(
        String plate, LocalDate dateStart, LocalDate dateEnd, UUID companyId);
  }
}
