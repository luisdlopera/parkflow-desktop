package com.parkflow.modules.configuration.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.configuration.repository.AgreementRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})
@ExtendWith(MockitoExtension.class)
class AgreementServiceTest {

  @Mock private AgreementRepository repo;
  @Mock private ParkingSiteRepository siteRepository;
  @Mock private RateRepository rateRepository;
  @Mock private AuditPort auditPort;

  private AgreementService service;
  private static final UUID COMPANY_ID = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    ObjectMapper mapper = new ObjectMapper()
        .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
    service = new AgreementService(repo, siteRepository, rateRepository, auditPort, mapper);
  }

  private AgreementRequest req(UUID rateId) {
    return new AgreementRequest("conv1", "Empresa SA", new BigDecimal("10.00"),
        4, new BigDecimal("0.0"), rateId, "DEFAULT", null,
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), true, "nota");
  }

  private Agreement agreement() {
    Agreement a = new Agreement();
    a.setId(UUID.randomUUID());
    a.setCompanyId(COMPANY_ID);
    a.setCode("CONV1");
    a.setCompanyName("Empresa SA");
    a.setActive(true);
    return a;
  }

  @Test
  void list_mapsPage() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      when(repo.search(any(), any(), any(), eq(COMPANY_ID), any()))
          .thenReturn(new PageImpl<>(java.util.List.of(agreement())));
      var result = service.list("DEFAULT", "q", true, PageRequest.of(0, 10));
      assertThat(result.content()).hasSize(1);
    }
  }

  @Test
  void get_returns() {
    Agreement a = agreement();
    when(repo.findById(a.getId())).thenReturn(Optional.of(a));
    AgreementResponse resp = service.get(a.getId());
    assertThat(resp.code()).isEqualTo("CONV1");
  }

  @Test
  void get_throwsWhenMissing() {
    UUID id = UUID.randomUUID();
    when(repo.findById(id)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.get(id))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Convenio no encontrado");
  }

  @Test
  void resolveByCode_returns() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      Agreement a = agreement();
      when(repo.findByCodeAndIsActiveTrueAndCompanyId("CONV1", COMPANY_ID))
          .thenReturn(Optional.of(a));
      AgreementResponse resp = service.resolveByCode("CONV1");
      assertThat(resp.code()).isEqualTo("CONV1");
    }
  }

  @Test
  void resolveByCode_throwsWhenMissing() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      when(repo.findByCodeAndIsActiveTrueAndCompanyId(any(), any()))
          .thenReturn(Optional.empty());
      assertThatThrownBy(() -> service.resolveByCode("X"))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("no encontrado o inactivo");
    }
  }

  @Test
  void create_succeeds() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      when(repo.existsByCodeAndCompanyId("conv1", COMPANY_ID)).thenReturn(false);
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      AgreementResponse resp = service.create(req(null));
      assertThat(resp.code()).isEqualTo("CONV1");
      verify(auditPort).record(any(), any(), any(), any());
    }
  }

  @Test
  void create_resolvesRate() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      UUID rateId = UUID.randomUUID();
      Rate rate = new Rate();
      rate.setId(rateId);
      rate.setName("Tarifa A");
      when(repo.existsByCodeAndCompanyId(any(), any())).thenReturn(false);
      when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      AgreementResponse resp = service.create(req(rateId));
      assertThat(resp.rateId()).isEqualTo(rateId);
    }
  }

  @Test
  void create_throwsWhenDuplicateCode() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      when(repo.existsByCodeAndCompanyId("conv1", COMPANY_ID)).thenReturn(true);
      assertThatThrownBy(() -> service.create(req(null)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Ya existe un convenio");
    }
  }

  @Test
  void create_throwsWhenRateMissing() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      UUID rateId = UUID.randomUUID();
      when(repo.existsByCodeAndCompanyId(any(), any())).thenReturn(false);
      when(rateRepository.findById(rateId)).thenReturn(Optional.empty());
      assertThatThrownBy(() -> service.create(req(rateId)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Tarifa no encontrada");
    }
  }

  @Test
  void update_succeeds() {
    Agreement a = agreement();
    when(repo.findById(a.getId())).thenReturn(Optional.of(a));
    when(repo.existsByCodeAndIdNotAndCompanyId("conv1", a.getId(), COMPANY_ID))
        .thenReturn(false);
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    AgreementResponse resp = service.update(a.getId(), req(null));
    assertThat(resp.companyName()).isEqualTo("Empresa SA");
    verify(auditPort).record(any(), any(), any(), any());
  }

  @Test
  void update_throwsWhenDuplicateCode() {
    Agreement a = agreement();
    when(repo.findById(a.getId())).thenReturn(Optional.of(a));
    when(repo.existsByCodeAndIdNotAndCompanyId(any(), any(), any())).thenReturn(true);
    assertThatThrownBy(() -> service.update(a.getId(), req(null)))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Ya existe otro convenio");
  }

  @Test
  void patchStatus_disables() {
    Agreement a = agreement();
    when(repo.findById(a.getId())).thenReturn(Optional.of(a));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    AgreementResponse resp = service.patchStatus(a.getId(), false);
    assertThat(resp.active()).isFalse();
    verify(auditPort).record(any(), any(), any(), any());
  }
}
