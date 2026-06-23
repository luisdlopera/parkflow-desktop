package com.parkflow.modules.licensing.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.Plan;
import com.parkflow.modules.licensing.domain.Subscription;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.PlanRepository;
import com.parkflow.modules.licensing.domain.repository.SubscriptionPort;
import com.parkflow.modules.licensing.dto.CreateSubscriptionRequest;
import com.parkflow.modules.licensing.enums.SubscriptionStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

  @Mock private SubscriptionPort subscriptionPort;
  @Mock private CompanyPort companyPort;
  @Mock private PlanRepository planRepository;

  private SubscriptionService service;
  private final UUID companyId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new SubscriptionService(subscriptionPort, companyPort, planRepository);
  }

  private Company company() {
    Company c = new Company();
    c.setId(companyId);
    c.setName("C1");
    return c;
  }

  private Plan plan() {
    Plan p = new Plan();
    p.setId(UUID.randomUUID());
    p.setName("P1");
    p.setCode("P1");
    return p;
  }

  @Test
  void listByCompanyReturnsMapped() {
    Subscription s = new Subscription();
    s.setId(UUID.randomUUID());
    s.setCompany(company());
    s.setPlan(plan());
    s.setStatus(SubscriptionStatus.ACTIVE);
    when(subscriptionPort.findAllByCompanyId(companyId)).thenReturn(List.of(s));

    var res = service.listByCompany(companyId);
    assertThat(res).hasSize(1);
    assertThat(res.get(0).status()).isEqualTo("ACTIVE");
  }

  @Test
  void getActiveReturnsActive() {
    Subscription s = new Subscription();
    s.setId(UUID.randomUUID());
    s.setCompany(company());
    s.setPlan(plan());
    s.setStatus(SubscriptionStatus.ACTIVE);
    when(subscriptionPort.findActiveByCompanyId(companyId)).thenReturn(Optional.of(s));

    var res = service.getActive(companyId);
    assertThat(res.status()).isEqualTo("ACTIVE");
  }

  @Test
  void getActiveThrowsIfNone() {
    when(subscriptionPort.findActiveByCompanyId(companyId)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.getActive(companyId)).isInstanceOf(OperationException.class);
  }

  @Test
  void createSuccess() {
    when(companyPort.findById(companyId)).thenReturn(Optional.of(company()));
    Plan p = plan();
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    when(subscriptionPort.findActiveByCompanyId(companyId)).thenReturn(Optional.empty());
    when(subscriptionPort.save(any())).thenAnswer(i -> {
      Subscription s = i.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });

    var req = new CreateSubscriptionRequest(p.getId(), null, null);
    var res = service.create(companyId, req);
    assertThat(res.status()).isEqualTo("ACTIVE");
  }

  @Test
  void createCancelsExisting() {
    when(companyPort.findById(companyId)).thenReturn(Optional.of(company()));
    Plan p = plan();
    when(planRepository.findById(p.getId())).thenReturn(Optional.of(p));
    
    Subscription existing = new Subscription();
    existing.setId(UUID.randomUUID());
    existing.setStatus(SubscriptionStatus.ACTIVE);
    when(subscriptionPort.findActiveByCompanyId(companyId)).thenReturn(Optional.of(existing));
    when(subscriptionPort.save(any())).thenAnswer(i -> {
      Subscription s = i.getArgument(0);
      if (s.getId() == null) s.setId(UUID.randomUUID());
      return s;
    });

    var req = new CreateSubscriptionRequest(p.getId(), OffsetDateTime.now(), OffsetDateTime.now().plusDays(30));
    service.create(companyId, req);
    assertThat(existing.getStatus()).isEqualTo(SubscriptionStatus.CANCELLED);
  }

  @Test
  void createThrowsIfCompanyNotFound() {
    when(companyPort.findById(companyId)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.create(companyId, new CreateSubscriptionRequest(UUID.randomUUID(), null, null)))
        .isInstanceOf(OperationException.class);
  }

  @Test
  void createThrowsIfPlanNotFound() {
    when(companyPort.findById(companyId)).thenReturn(Optional.of(company()));
    when(planRepository.findById(any())).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.create(companyId, new CreateSubscriptionRequest(UUID.randomUUID(), null, null)))
        .isInstanceOf(OperationException.class);
  }

  @Test
  void cancelSuccess() {
    UUID subId = UUID.randomUUID();
    Subscription s = new Subscription();
    s.setId(subId);
    s.setCompany(company());
    s.setPlan(plan());
    s.setStatus(SubscriptionStatus.ACTIVE);
    when(subscriptionPort.findById(subId)).thenReturn(Optional.of(s));
    when(subscriptionPort.save(any())).thenAnswer(i -> i.getArgument(0));

    var res = service.cancel(companyId, subId);
    assertThat(res.status()).isEqualTo("CANCELLED");
  }

  @Test
  void cancelThrowsIfWrongCompany() {
    UUID subId = UUID.randomUUID();
    Subscription s = new Subscription();
    s.setId(subId);
    Company c = company();
    c.setId(UUID.randomUUID());
    s.setCompany(c);
    when(subscriptionPort.findById(subId)).thenReturn(Optional.of(s));

    assertThatThrownBy(() -> service.cancel(companyId, subId)).isInstanceOf(OperationException.class);
  }

  @Test
  void cancelThrowsIfNotFound() {
    when(subscriptionPort.findById(any())).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.cancel(companyId, UUID.randomUUID())).isInstanceOf(OperationException.class);
  }

  @Test
  void suspendSuccess() {
    UUID subId = UUID.randomUUID();
    Subscription s = new Subscription();
    s.setId(subId);
    s.setCompany(company());
    s.setPlan(plan());
    s.setStatus(SubscriptionStatus.ACTIVE);
    when(subscriptionPort.findById(subId)).thenReturn(Optional.of(s));
    when(subscriptionPort.save(any())).thenAnswer(i -> i.getArgument(0));

    var res = service.suspend(companyId, subId);
    assertThat(res.status()).isEqualTo("SUSPENDED");
  }

  @Test
  void suspendThrowsIfWrongCompany() {
    UUID subId = UUID.randomUUID();
    Subscription s = new Subscription();
    s.setId(subId);
    Company c = company();
    c.setId(UUID.randomUUID());
    s.setCompany(c);
    when(subscriptionPort.findById(subId)).thenReturn(Optional.of(s));

    assertThatThrownBy(() -> service.suspend(companyId, subId)).isInstanceOf(OperationException.class);
  }

  @Test
  void suspendThrowsIfNotFound() {
    when(subscriptionPort.findById(any())).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.suspend(companyId, UUID.randomUUID())).isInstanceOf(OperationException.class);
  }
}
