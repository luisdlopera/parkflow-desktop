package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.PrepaidBalance;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrepaidBalanceRepository extends JpaRepository<PrepaidBalance, UUID> {

  /** Busca saldos activos y no expirados por placa, ordenados por vencimiento más próximo. */
  @Query(
      "SELECT pb FROM PrepaidBalance pb WHERE pb.plate = :plate AND pb.isActive = true "
          + "AND pb.remainingMinutes > 0 AND pb.expiresAt > :now ORDER BY pb.expiresAt ASC")
  List<PrepaidBalance> findActiveByPlate(
      @Param("plate") String plate, @Param("now") OffsetDateTime now);

  List<PrepaidBalance> findAllByPlateOrderByExpiresAtAsc(String plate);

  Optional<PrepaidBalance> findFirstByPlateAndIsActiveTrueAndRemainingMinutesGreaterThanAndExpiresAtAfter(
      String plate, int minMinutes, OffsetDateTime now);
}
