package com.parkflow.modules.onboarding.infrastructure.persistence;

import com.parkflow.modules.onboarding.domain.OnboardingRuleSnapshot;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OnboardingRuleSnapshotRepository extends JpaRepository<OnboardingRuleSnapshot, UUID> {
  
  @Query(value = "SELECT * FROM onboarding_rule_snapshots ORDER BY version DESC LIMIT 1", nativeQuery = true)
  OnboardingRuleSnapshot findLatestSnapshot();
}
