package com.parkflow.modules.licensing.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.Subscription;
import com.parkflow.modules.licensing.domain.repository.SubscriptionPort;
import com.parkflow.modules.licensing.enums.SubscriptionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Component
@RequiredArgsConstructor
public class SubscriptionJpaAdapter implements SubscriptionPort {

  private final SubscriptionJpaRepository jpaRepository;

  @Override
  public Optional<Subscription> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public Optional<Subscription> findActiveByCompanyId(UUID companyId) {
    return jpaRepository.findTopByCompanyIdAndStatusOrderByStartsAtDesc(companyId, SubscriptionStatus.ACTIVE);
  }

  @Override
  public List<Subscription> findAllByCompanyId(UUID companyId) {
    return jpaRepository.findAllByCompanyIdOrderByStartsAtDesc(companyId);
  }

  @Override
  public List<Subscription> findAllByStatus(SubscriptionStatus status) {
    return jpaRepository.findAllByStatus(status);
  }

  @Override
  public Subscription save(Subscription subscription) {
    return jpaRepository.save(subscription);
  }

  @Override
  public void deleteById(UUID id) {
    jpaRepository.deleteById(id);
  }

  @Repository
  interface SubscriptionJpaRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findTopByCompanyIdAndStatusOrderByStartsAtDesc(UUID companyId, SubscriptionStatus status);
    List<Subscription> findAllByCompanyIdOrderByStartsAtDesc(UUID companyId);
    List<Subscription> findAllByStatus(SubscriptionStatus status);

    @Query("SELECT COUNT(s) FROM Subscription s WHERE s.status = :status AND (s.endsAt IS NULL OR s.endsAt > CURRENT_TIMESTAMP)")
    long countActive(@Param("status") SubscriptionStatus status);
  }
}
