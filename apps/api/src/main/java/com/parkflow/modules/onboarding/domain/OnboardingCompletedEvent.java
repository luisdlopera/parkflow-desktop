package com.parkflow.modules.onboarding.domain;

import com.parkflow.modules.licensing.domain.Company;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
@SuppressWarnings("serial")
public class OnboardingCompletedEvent extends ApplicationEvent {

  private final UUID companyId;
  private final Company company;
  private final Map<String, Object> progressData;
  private final Map<String, Object> finalSettings;
  private final boolean isSkipped;
  private final OffsetDateTime completedAt;

  public OnboardingCompletedEvent(
      Object source, 
      Company company, 
      Map<String, Object> progressData,
      Map<String, Object> finalSettings,
      boolean isSkipped) {
    super(source);
    this.companyId = company.getId();
    this.company = company;
    this.progressData = progressData;
    this.finalSettings = finalSettings;
    this.isSkipped = isSkipped;
    this.completedAt = OffsetDateTime.now();
  }
}
