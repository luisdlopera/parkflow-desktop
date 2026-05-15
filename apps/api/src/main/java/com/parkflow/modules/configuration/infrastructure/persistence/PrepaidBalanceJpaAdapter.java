package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.repository.PrepaidBalancePort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PrepaidBalanceJpaAdapter implements PrepaidBalancePort {

  private final PrepaidBalanceJpaRepository jpaRepository;

  @Override
  public List<PrepaidBalance> findActiveByPlate(String plate, OffsetDateTime now, UUID companyId) {
    return jpaRepository.findActiveByPlate(plate, now, companyId);
  }

  @Override
  public List<PrepaidBalance> findAllByPlateAndCompanyIdOrderByExpiresAtAsc(String plate, UUID companyId) {
    return jpaRepository.findAllByPlateAndCompanyIdOrderByExpiresAtAsc(plate, companyId);
  }

  @Override
  public Optional<PrepaidBalance> findFirstByPlateAndCompanyIdAndIsActiveTrueAndRemainingMinutesGreaterThanAndExpiresAtAfter(
      String plate, UUID companyId, int minMinutes, OffsetDateTime now) {
    return jpaRepository.findFirstByPlateAndCompanyIdAndIsActiveTrueAndRemainingMinutesGreaterThanAndExpiresAtAfter(
        plate, companyId, minMinutes, now);
  }

  @Override
  public PrepaidBalance save(PrepaidBalance balance) {
    return jpaRepository.save(balance);
  }

  @Override
  public Optional<PrepaidBalance> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface PrepaidBalanceJpaRepository extends JpaRepository<PrepaidBalance, UUID> {
    @Query("SELECT pb FROM PrepaidBalance pb WHERE pb.plate = :plate AND pb.companyId = :cid " +
           "AND pb.isActive = true AND pb.remainingMinutes > 0 AND pb.expiresAt > :now ORDER BY pb.expiresAt ASC")
    List<PrepaidBalance> findActiveByPlate(@Param("plate") String plate, @Param("now") OffsetDateTime now, @Param("cid") UUID companyId);

    List<PrepaidBalance> findAllByPlateAndCompanyIdOrderByExpiresAtAsc(String plate, UUID companyId);

    Optional<PrepaidBalance> findFirstByPlateAndCompanyIdAndIsActiveTrueAndRemainingMinutesGreaterThanAndExpiresAtAfter(
        String plate, UUID companyId, int minMinutes, OffsetDateTime now);
  }
}
