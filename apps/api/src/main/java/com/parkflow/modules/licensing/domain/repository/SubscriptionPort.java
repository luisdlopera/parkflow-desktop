package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.Subscription;
import com.parkflow.modules.licensing.enums.SubscriptionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionPort {
  Optional<Subscription> findById(UUID id);
  Optional<Subscription> findActiveByCompanyId(UUID companyId);
  List<Subscription> findAllByCompanyId(UUID companyId);
  List<Subscription> findAllByStatus(SubscriptionStatus status);
  Subscription save(Subscription subscription);
  void deleteById(UUID id);
}
