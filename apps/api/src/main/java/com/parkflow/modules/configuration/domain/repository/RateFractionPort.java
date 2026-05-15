package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.RateFraction;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RateFractionPort {
  List<RateFraction> findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(UUID rateId);
  void deleteByRate_Id(UUID rateId);
  RateFraction save(RateFraction fraction);
  Optional<RateFraction> findById(UUID id);
}
