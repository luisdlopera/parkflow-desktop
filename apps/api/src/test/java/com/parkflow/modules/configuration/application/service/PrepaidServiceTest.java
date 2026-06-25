package com.parkflow.modules.configuration.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.PrepaidPackage;
import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.repository.PrepaidBalanceRepository;
import com.parkflow.modules.configuration.repository.PrepaidPackageRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class PrepaidServiceTest {

  @Mock private PrepaidPackageRepository packageRepo;
  @Mock private PrepaidBalanceRepository balanceRepo;
  @Mock private ParkingSiteRepository siteRepository;
  @Mock private AuditPort auditPort;

  private PrepaidService service;

  @BeforeEach
  void setUp() {
    service = new PrepaidService(packageRepo, balanceRepo, siteRepository, auditPort,
        new ObjectMapper());
  }

  private PrepaidPackage pkg() {
    PrepaidPackage p = new PrepaidPackage();
    p.setId(UUID.randomUUID());
    p.setName("Pack 10h");
    p.setHoursIncluded(10);
    p.setAmount(new BigDecimal("50000"));
    p.setExpiresDays(30);
    p.setActive(true);
    return p;
  }

  private PrepaidPackageRequest pkgReq(int expiresDays) {
    return new PrepaidPackageRequest("Pack 10h", 10, new BigDecimal("50000"),
        "AUTO", "DEFAULT", null, expiresDays, true);
  }

  @Test
  void listPackages_mapsPage() {
    when(packageRepo.search(any(), any(), any(), any()))
        .thenReturn(new PageImpl<>(List.of(pkg())));
    var result = service.listPackages("DEFAULT", "q", true, PageRequest.of(0, 10));
    assertThat(result.content()).hasSize(1);
  }

  @Test
  void getPackage_returns() {
    PrepaidPackage p = pkg();
    when(packageRepo.findById(p.getId())).thenReturn(Optional.of(p));
    PrepaidPackageResponse resp = service.getPackage(p.getId());
    assertThat(resp.name()).isEqualTo("Pack 10h");
  }

  @Test
  void getPackage_throwsWhenMissing() {
    UUID id = UUID.randomUUID();
    when(packageRepo.findById(id)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.getPackage(id))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Paquete no encontrado");
  }

  @Test
  void createPackage_defaultsExpiresWhenZero() {
    when(packageRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    PrepaidPackageResponse resp = service.createPackage(pkgReq(0));
    assertThat(resp.expiresDays()).isEqualTo(30);
    verify(auditPort).record(any(), any(), any(), any());
  }

  @Test
  void updatePackage_updatesFields() {
    PrepaidPackage p = pkg();
    when(packageRepo.findById(p.getId())).thenReturn(Optional.of(p));
    when(packageRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    PrepaidPackageResponse resp = service.updatePackage(p.getId(), pkgReq(15));
    assertThat(resp.expiresDays()).isEqualTo(15);
  }

  @Test
  void patchPackageStatus_disables() {
    PrepaidPackage p = pkg();
    when(packageRepo.findById(p.getId())).thenReturn(Optional.of(p));
    when(packageRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    PrepaidPackageResponse resp = service.patchPackageStatus(p.getId(), false);
    assertThat(resp.active()).isFalse();
  }

  @Test
  void getBalancesByPlate_normalizesPlate() {
    PrepaidBalance b = balance(pkg(), 100);
    when(balanceRepo.findAllByPlateOrderByExpiresAtAsc("ABC123"))
        .thenReturn(List.of(b));
    List<PrepaidBalanceResponse> result = service.getBalancesByPlate(" abc123 ");
    assertThat(result).hasSize(1);
  }

  @Test
  void purchase_createsBalance() {
    PrepaidPackage p = pkg();
    when(packageRepo.findById(p.getId())).thenReturn(Optional.of(p));
    when(balanceRepo.save(any())).thenAnswer(i -> {
      PrepaidBalance b = i.getArgument(0);
      b.setId(UUID.randomUUID());
      return b;
    });
    PrepaidBalanceResponse resp = service.purchase(
        new PrepaidBalancePurchaseRequest(p.getId(), "abc123", "Juan"));
    assertThat(resp.plate()).isEqualTo("ABC123");
    assertThat(resp.remainingMinutes()).isEqualTo(600);
  }

  @Test
  void purchase_throwsWhenPackageInactive() {
    PrepaidPackage p = pkg();
    p.setActive(false);
    when(packageRepo.findById(p.getId())).thenReturn(Optional.of(p));
    assertThatThrownBy(() -> service.purchase(
        new PrepaidBalancePurchaseRequest(p.getId(), "abc", "Juan")))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("no está activo");
  }

  @Test
  void deduct_subtractsMinutes() {
    PrepaidBalance b = balance(pkg(), 100);
    when(balanceRepo.findById(b.getId())).thenReturn(Optional.of(b));
    when(balanceRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    PrepaidBalanceResponse resp = service.deduct(b.getId(), 40);
    assertThat(resp.remainingMinutes()).isEqualTo(60);
    assertThat(resp.active()).isTrue();
  }

  @Test
  void deduct_deactivatesWhenZero() {
    PrepaidBalance b = balance(pkg(), 40);
    when(balanceRepo.findById(b.getId())).thenReturn(Optional.of(b));
    when(balanceRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    PrepaidBalanceResponse resp = service.deduct(b.getId(), 40);
    assertThat(resp.remainingMinutes()).isZero();
    assertThat(resp.active()).isFalse();
  }

  @Test
  void deduct_throwsWhenNotFound() {
    UUID id = UUID.randomUUID();
    when(balanceRepo.findById(id)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.deduct(id, 10))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Saldo no encontrado");
  }

  @Test
  void deduct_throwsWhenInactive() {
    PrepaidBalance b = balance(pkg(), 100);
    b.setActive(false);
    when(balanceRepo.findById(b.getId())).thenReturn(Optional.of(b));
    assertThatThrownBy(() -> service.deduct(b.getId(), 10))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("no está activo");
  }

  @Test
  void deduct_throwsWhenExpired() {
    PrepaidBalance b = balance(pkg(), 100);
    b.setExpiresAt(OffsetDateTime.now().minusDays(1));
    when(balanceRepo.findById(b.getId())).thenReturn(Optional.of(b));
    assertThatThrownBy(() -> service.deduct(b.getId(), 10))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("vencido");
  }

  @Test
  void deduct_throwsWhenInsufficient() {
    PrepaidBalance b = balance(pkg(), 20);
    when(balanceRepo.findById(b.getId())).thenReturn(Optional.of(b));
    assertThatThrownBy(() -> service.deduct(b.getId(), 50))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("insuficiente");
  }

  private PrepaidBalance balance(PrepaidPackage p, int minutes) {
    PrepaidBalance b = new PrepaidBalance();
    b.setId(UUID.randomUUID());
    b.setPrepaidPackage(p);
    b.setPlate("ABC123");
    b.setRemainingMinutes(minutes);
    b.setActive(true);
    b.setExpiresAt(OffsetDateTime.now().plusDays(10));
    return b;
  }
}
