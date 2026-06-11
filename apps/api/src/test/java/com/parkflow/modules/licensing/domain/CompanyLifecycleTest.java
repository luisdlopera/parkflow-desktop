package com.parkflow.modules.licensing.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class CompanyLifecycleTest {

  @Test
  void isLicenseActive_for_active_company() {
    Company c = new Company();
    c.setStatus(CompanyStatus.ACTIVE);
    assertThat(c.isLicenseActive()).isTrue();
  }

  @Test
  void isLicenseActive_for_expired_company_false() {
    Company c = new Company();
    c.setStatus(CompanyStatus.EXPIRED);
    assertThat(c.isLicenseActive()).isFalse();
  }

  @Test
  void grace_period_allows_write_operations() {
    Company c = new Company();
    c.setStatus(CompanyStatus.PAST_DUE);
    c.setGraceUntil(OffsetDateTime.now().plusDays(1));
    assertThat(c.isInGracePeriod()).isTrue();
    assertThat(c.allowsWriteOperations()).isTrue();
  }

  @Test
  void trial_company_allows_write() {
    Company c = new Company();
    c.setStatus(CompanyStatus.TRIAL);
    c.setTrialDays(10);
    OffsetDateTime started = OffsetDateTime.now().minusDays(1);
    c.setTrialStartedAt(started);
    c.setExpiresAt(started.plusDays(c.getTrialDays()));
    assertThat(c.isLicenseActive()).isTrue();
  }
}
