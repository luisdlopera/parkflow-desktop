package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.RateFraction;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RateFractionRepository extends JpaRepository<RateFraction, UUID> {

  List<RateFraction> findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(UUID rateId);

  void deleteByRate_Id(UUID rateId);
}
