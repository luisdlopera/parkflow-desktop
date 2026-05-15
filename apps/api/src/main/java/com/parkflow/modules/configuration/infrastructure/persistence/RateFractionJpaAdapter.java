package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.RateFraction;
import com.parkflow.modules.configuration.domain.repository.RateFractionPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RateFractionJpaAdapter implements RateFractionPort {

  private final RateFractionJpaRepository jpaRepository;

  @Override
  public List<RateFraction> findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(UUID rateId) {
    return jpaRepository.findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(rateId);
  }

  @Override
  public void deleteByRate_Id(UUID rateId) {
    jpaRepository.deleteByRate_Id(rateId);
  }

  @Override
  public RateFraction save(RateFraction fraction) {
    return jpaRepository.save(fraction);
  }

  @Override
  public Optional<RateFraction> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface RateFractionJpaRepository extends JpaRepository<RateFraction, UUID> {
    List<RateFraction> findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(UUID rateId);
    void deleteByRate_Id(UUID rateId);
  }
}
