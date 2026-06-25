package com.parkflow.modules.settings.application.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.common.dto.RateUpsertRequest;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.service.RateDomainService;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
import com.parkflow.modules.settings.application.mapper.RateMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class UpdateRateServiceTest {

  @Mock private RatePort ratePort;
  @Mock private RateMapper rateMapper;
  @Mock private RateDomainService rateDomainService;
  @Mock private ParkingSitePort parkingSiteRepository;
  @Mock private SettingsAuditService settingsAuditService;
  @Mock private AuditPort globalAuditService;
  @Mock private ObjectMapper objectMapper;

  @InjectMocks
  private UpdateRateService service;

  private UUID companyId;

  private static RateUpsertRequest buildRequest(UUID siteId) {
    return new RateUpsertRequest(
        "Test Rate", "CAR", RateCategory.STANDARD, RateType.HOURLY,
        BigDecimal.TEN, 0, 0, 15, RoundingMode.UP,
        BigDecimal.ZERO, true, "S1", siteId,
        null, 0, null, 0,
        null, null, null,
        false, null, false, null,
        null, null, null,
        null, null);
  }

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    SecurityContext secCtx = mock(SecurityContext.class);
    Authentication auth = mock(Authentication.class);
    AuthPrincipal principal = new AuthPrincipal(UUID.randomUUID(), companyId, "test@test.com", "ROLE_ADMIN", List.of());
    org.mockito.Mockito.lenient().when(secCtx.getAuthentication()).thenReturn(auth);
    org.mockito.Mockito.lenient().when(auth.getPrincipal()).thenReturn(principal);
    SecurityContextHolder.setContext(secCtx);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void update_Success() throws Exception {
    UUID rateId = UUID.randomUUID();
    UUID siteId = UUID.randomUUID();

    Rate rate = new Rate();
    rate.setId(rateId);

    Rate updated = new Rate();
    updated.setId(rateId);
    updated.setName("Test Rate");

    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    site.setCode("S1");

    RateUpsertRequest req = buildRequest(siteId);

    when(ratePort.findById(rateId)).thenReturn(Optional.of(rate));
    when(rateMapper.fromRequest(req, rate)).thenReturn(updated);
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(ratePort.save(updated)).thenReturn(updated);
    when(rateMapper.toResponse(updated)).thenReturn(null);
    when(objectMapper.writeValueAsString(any())).thenReturn("{}");

    service.update(rateId, req);

    // Site field removed from Rate entity (V022__drop_deprecated_columns.sql)
    verify(rateDomainService).validateRate(updated, rateId, companyId);
    verify(settingsAuditService).log(eq(AuthAuditAction.SETTINGS_RATE_UPDATE), eq("OK"), any());
    verify(globalAuditService).record(any(), any(), any(), any());
  }

  @Test
  void update_RateNotFound() {
    UUID rateId = UUID.randomUUID();
    RateUpsertRequest req = buildRequest(null);
    when(ratePort.findById(rateId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.update(rateId, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Tarifa no encontrada");
  }

  @Test
  void update_SiteNotFound() {
    UUID rateId = UUID.randomUUID();
    UUID siteId = UUID.randomUUID();
    Rate rate = new Rate();
    RateUpsertRequest req = buildRequest(siteId);

    when(ratePort.findById(rateId)).thenReturn(Optional.of(rate));
    when(rateMapper.fromRequest(req, rate)).thenReturn(rate);
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.update(rateId, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sede no encontrada");
  }

  @Test
  void update_DataIntegrityViolation() {
    UUID rateId = UUID.randomUUID();
    Rate rate = new Rate();
    RateUpsertRequest req = buildRequest(null);

    when(ratePort.findById(rateId)).thenReturn(Optional.of(rate));
    when(rateMapper.fromRequest(req, rate)).thenReturn(rate);
    when(ratePort.save(rate)).thenThrow(new DataIntegrityViolationException("duplicate"));

    assertThatThrownBy(() -> service.update(rateId, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Conflicto de integridad");
  }
}
