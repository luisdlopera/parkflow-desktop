package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.dto.CashClosingPrintResponse;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import com.parkflow.modules.cash.dto.CashRegisterInfoResponse;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.application.port.in.CashSessionUseCase;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.application.service.CashDomainAuditService;
import com.parkflow.modules.cash.application.service.CashPolicyResolver;
import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CashConfigurationManagementServiceTest {

  @Mock private CashRegisterRepository cashRegisterRepository;
  @Mock private CashSessionRepository cashSessionRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private CashPolicyResolver cashPolicyResolver;
  @Mock private ParkingParametersService parkingParametersService;
  @Mock private CashSessionUseCase cashSessionUseCase;
  @Mock private AuthAuditService authAuditService;
  @Mock private CashDomainAuditService cashDomainAuditService;

  private CashConfigurationManagementService service;
  private static final UUID USER_ID = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new CashConfigurationManagementService(
        cashRegisterRepository, cashSessionRepository, appUserRepository,
        cashPolicyResolver, parkingParametersService, cashSessionUseCase,
        authAuditService, cashDomainAuditService);
  }

  @Test
  void getPolicy_delegatesToResolver() {
    CashPolicyResponse expected = new CashPolicyResponse(true, true, new BigDecimal("100"), "hint", "default");
    when(cashPolicyResolver.resolvePolicy("SUR")).thenReturn(expected);
    assertThat(service.getPolicy(" SUR ")).isEqualTo(expected);
  }

  @Test
  void getPolicy_nullSiteResolvesNull() {
    CashPolicyResponse expected = new CashPolicyResponse(false, false, null, null, null);
    when(cashPolicyResolver.resolvePolicy(null)).thenReturn(expected);
    assertThat(service.getPolicy("  ")).isEqualTo(expected);
  }

  @Test
  void listRegisters_mapsResults() {
    CashRegister r = new CashRegister();
    r.setId(UUID.randomUUID());
    r.setSite("default");
    r.setTerminal("T1");
    r.setLabel("Caja 1");
    when(cashRegisterRepository.findBySiteOrderByTerminalAsc("default"))
        .thenReturn(List.of(r));
    List<CashRegisterInfoResponse> result = service.listRegisters(null);
    assertThat(result).hasSize(1);
    assertThat(result.get(0).terminal()).isEqualTo("T1");
  }

  @Test
  void printClosing_throwsWhenSessionNotFound() {
    UUID id = UUID.randomUUID();
    when(cashSessionRepository.findById(id)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.printClosing(id))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sesion de caja no encontrada");
  }

  @Test
  void printClosing_throwsWhenNotClosed() {
    UUID id = UUID.randomUUID();
    CashSession session = openSession(id);
    session.setStatus(CashSessionStatus.OPEN);
    when(cashSessionRepository.findById(id)).thenReturn(Optional.of(session));
    assertThatThrownBy(() -> service.printClosing(id))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("caja cerrada");
  }

  @Test
  void printClosing_buildsTicketWithFiscalParams() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireUserId).thenReturn(USER_ID);

      UUID id = UUID.randomUUID();
      CashSession session = openSession(id);
      session.setStatus(CashSessionStatus.CLOSED);
      session.setClosedAt(OffsetDateTime.now());
      session.setCountedAmount(new BigDecimal("100000"));
      session.setDifferenceAmount(new BigDecimal("0.00"));
      session.setClosingWitnessName("Testigo X");
      session.setSupportDocumentNumber("SOP-001");

      AppUser actor = new AppUser();
      actor.setName("Cajero");
      when(cashSessionRepository.findById(id)).thenReturn(Optional.of(session));
      when(appUserRepository.findById(USER_ID)).thenReturn(Optional.of(actor));

      CashSummaryResponse summary = new CashSummaryResponse(
          new BigDecimal("50000"), new BigDecimal("150000"),
          new BigDecimal("150000"), BigDecimal.ZERO,
          Map.of("CASH", new BigDecimal("100000"), "CARD", new BigDecimal("50000")),
          Map.of("PARKING_PAYMENT", new BigDecimal("150000")),
          5L);
      when(cashSessionUseCase.getSummary(id)).thenReturn(summary);

      ParkingParametersData param = new ParkingParametersData();
      param.setParkingName("Mi Parqueadero");
      param.setBusinessLegalName("Mi Parqueadero SAS");
      param.setTaxId("900123456");
      param.setTaxIdCheckDigit("7");
      param.setDianInvoicePrefix("FE");
      param.setDianResolutionNumber("18760");
      param.setDianResolutionDate("2026-01-01");
      param.setDianRangeFrom("1");
      param.setDianRangeTo("1000");
      when(parkingParametersService.get(any())).thenReturn(param);

      CashClosingPrintResponse resp = service.printClosing(id);

      assertThat(resp.documentType()).isEqualTo("CASH_CLOSING");
      assertThat(resp.previewLines()).anyMatch(l -> l.contains("Mi Parqueadero"));
      assertThat(resp.previewLines()).anyMatch(l -> l.contains("NIT: 900123456-7"));
      assertThat(resp.previewLines()).anyMatch(l -> l.contains("Cobros parqueo"));
      assertThat(resp.previewLines()).anyMatch(l -> l.contains("Efectivo neto libro"));
      verify(authAuditService).log(any(), any(), any(), any(), any());
      verify(cashDomainAuditService).log(any(), any(), any(), any(), any(), any(), any());
    }
  }

  @Test
  void printClosing_handlesNullParamsAndEmptyTotals() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireUserId).thenReturn(USER_ID);

      UUID id = UUID.randomUUID();
      CashSession session = openSession(id);
      session.setStatus(CashSessionStatus.CLOSED);

      AppUser actor = new AppUser();
      actor.setName("Cajero");
      when(cashSessionRepository.findById(id)).thenReturn(Optional.of(session));
      when(appUserRepository.findById(USER_ID)).thenReturn(Optional.of(actor));

      CashSummaryResponse summary = new CashSummaryResponse(
          new BigDecimal("0"), new BigDecimal("0"), new BigDecimal("0"), BigDecimal.ZERO,
          Map.of(), Map.of(), 0L);
      when(cashSessionUseCase.getSummary(id)).thenReturn(summary);
      when(parkingParametersService.get(any())).thenReturn(null);

      CashClosingPrintResponse resp = service.printClosing(id);

      assertThat(resp.previewLines()).anyMatch(l -> l.contains("(sin movimientos)"));
      assertThat(resp.previewLines()).anyMatch(l -> l.contains("(sin medios registrados)"));
      assertThat(resp.previewLines()).anyMatch(l -> l.contains("(sin parametros de sede)"));
    }
  }

  private CashSession openSession(UUID id) {
    CashRegister reg = new CashRegister();
    reg.setSite("default");
    reg.setTerminal("T1");
    AppUser operator = new AppUser();
    operator.setName("Operador");
    CashSession s = new CashSession();
    s.setId(id);
    s.setCashRegister(reg);
    s.setOperator(operator);
    s.setClosedBy(operator);
    return s;
  }
}
