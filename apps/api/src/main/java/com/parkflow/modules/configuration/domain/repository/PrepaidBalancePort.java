package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.PrepaidBalance;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrepaidBalancePort {
  List<PrepaidBalance> findActiveByPlate(String plate, OffsetDateTime now, UUID companyId);
  List<PrepaidBalance> findAllByPlateAndCompanyIdOrderByExpiresAtAsc(String plate, UUID companyId);
  Optional<PrepaidBalance> findFirstByPlateAndCompanyIdAndIsActiveTrueAndRemainingMinutesGreaterThanAndExpiresAtAfter(
      String plate, UUID companyId, int minMinutes, OffsetDateTime now);
  PrepaidBalance save(PrepaidBalance balance);
  Optional<PrepaidBalance> findById(UUID id);
}
