package com.parkflow.modules.licensing.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import org.junit.jupiter.api.Test;

class LicenseCompanyLifecycleServiceTest {

  private final LicenseCompanyLifecycleService service = new LicenseCompanyLifecycleService();

  @Test
  void createFromWithTrial() {
    CreateCompanyRequest req = new CreateCompanyRequest();
    req.setName("C1");
    req.setPlan(PlanType.PRO);
    req.setTrialDays(10);

    Company c = service.createFrom(req);
    assertThat(c.getName()).isEqualTo("C1");
    assertThat(c.getStatus()).isEqualTo(CompanyStatus.TRIAL);
    assertThat(c.getTrialStartedAt()).isNotNull();
    assertThat(c.getTrialDays()).isEqualTo(10);
    assertThat(c.getExpiresAt()).isNotNull();
    assertThat(c.getGraceUntil()).isNotNull();
  }

  @Test
  void createFromWithoutTrial() {
    CreateCompanyRequest req = new CreateCompanyRequest();
    req.setName("C1");
    req.setPlan(PlanType.PRO);
    req.setTrialDays(0);

    Company c = service.createFrom(req);
    assertThat(c.getStatus()).isEqualTo(CompanyStatus.ACTIVE);
    assertThat(c.getTrialDays()).isIn(null, 0, 14);
    assertThat(c.getExpiresAt()).isNotNull();
    assertThat(c.getGraceUntil()).isNotNull();
  }

  @Test
  void applyUpdate() {
    Company c = new Company();
    c.setName("Old");

    UpdateCompanyRequest req = new UpdateCompanyRequest();
    req.setName("New");
    req.setNit("123");
    req.setAddress("A");
    req.setCity("C");
    req.setPhone("P");
    req.setEmail("E");
    req.setContactName("N");
    req.setPlan(PlanType.ENTERPRISE);
    req.setStatus(CompanyStatus.SUSPENDED);
    req.setMaxDevices(2);
    req.setMaxLocations(2);
    req.setMaxUsers(2);
    req.setOfflineModeAllowed(false);
    req.setOfflineLeaseHours(24);
    req.setCustomerMessage("msg");
    req.setAdminNotes("notes");

    service.applyUpdate(c, req);

    assertThat(c.getName()).isEqualTo("New");
    assertThat(c.getNit()).isEqualTo("123");
    assertThat(c.getAddress()).isEqualTo("A");
    assertThat(c.getCity()).isEqualTo("C");
    assertThat(c.getPhone()).isEqualTo("P");
    assertThat(c.getEmail()).isEqualTo("E");
    assertThat(c.getContactName()).isEqualTo("N");
    assertThat(c.getPlan()).isEqualTo(PlanType.ENTERPRISE);
    assertThat(c.getStatus()).isEqualTo(CompanyStatus.SUSPENDED);
    assertThat(c.getMaxDevices()).isEqualTo(2);
    assertThat(c.getMaxLocations()).isEqualTo(2);
    assertThat(c.getMaxUsers()).isEqualTo(2);
    assertThat(c.getOfflineModeAllowed()).isFalse();
    assertThat(c.getOfflineLeaseHours()).isEqualTo(24);
    assertThat(c.getCustomerMessage()).isEqualTo("msg");
    assertThat(c.getAdminNotes()).isEqualTo("notes");
  }
}
