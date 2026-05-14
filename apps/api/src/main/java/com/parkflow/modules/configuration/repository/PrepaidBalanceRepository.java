package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.PrepaidBalance;
import com.parkflow.modules.auth.security.TenantContext;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrepaidBalanceRepository extends JpaRepository<PrepaidBalance, UUID> {

  @Query("SELECT pb FROM PrepaidBalance pb WHERE pb.plate = :plate AND pb.companyId = :cid " +
         "AND pb.isActive = true AND pb.remainingMinutes > 0 AND pb.expiresAt > :now ORDER BY pb.expiresAt ASC")
  List<PrepaidBalance> findActiveByPlate(@Param("plate") String plate, @Param("now") OffsetDateTime now, @Param("cid") UUID companyId);

  List<PrepaidBalance> findAllByPlateAndCompanyIdOrderByExpiresAtAsc(String plate, UUID companyId);

  Optional<PrepaidBalance> findFirstByPlateAndCompanyIdAndIsActiveTrueAndRemainingMinutesGreaterThanAndExpiresAtAfter(
      String plate, UUID companyId, int minMinutes, OffsetDateTime now);

  default List<PrepaidBalance> findActiveByPlate(String plate, OffsetDateTime now) {
    return findActiveByPlate(plate, now, TenantContext.getTenantId());
  }

  default List<PrepaidBalance> findAllByPlateOrderByExpiresAtAsc(String plate) {
    return findAllByPlateAndCompanyIdOrderByExpiresAtAsc(plate, TenantContext.getTenantId());
  }
}
