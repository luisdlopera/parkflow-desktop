package com.parkflow.modules.settings.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.RateStatusRequest;
import com.parkflow.modules.common.dto.RateUpsertRequest;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.settings.repository.MasterVehicleTypeRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class SettingsRateServiceTest {

  @Mock private RateRepository rateRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private SettingsAuditService settingsAuditService;
  @Mock private MasterVehicleTypeRepository vehicleTypeRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private AuditPort globalAuditService;
  @Mock private ObjectMapper objectMapper;
  @Mock private RateValidationService rateValidationService;

  @InjectMocks
  private SettingsRateService service;

  private UUID companyId;

  private static RateUpsertRequest buildRequest(UUID siteId) {
    return new RateUpsertRequest(
        "Rate 1", "CAR", RateCategory.STANDARD, RateType.HOURLY,
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

  private Rate buildRate(UUID id) {
    Rate rate = new Rate();
    rate.setId(id != null ? id : UUID.randomUUID());
    rate.setName("Rate 1");
    rate.setCompanyId(companyId);
    rate.setRateType(RateType.HOURLY);
    rate.setCategory(RateCategory.STANDARD);
    rate.setAmount(BigDecimal.TEN);
    rate.setSite("S1");
    rate.setActive(true);
    return rate;
  }

  @Test
  void list_Success() {
    Rate rate = buildRate(null);
    Page<Rate> page = new PageImpl<>(List.of(rate));
    when(rateRepository.search(anyString(), isNull(), isNull(), (String) isNull(), any())).thenReturn(page);

    SettingsPageResponse<RateResponse> res = service.list(null, null, null, null, PageRequest.of(0, 10));
    assertThat(res.content()).hasSize(1);
    assertThat(res.content().get(0).name()).isEqualTo("Rate 1");
  }

  @Test
  void get_Success() {
    UUID rateId = UUID.randomUUID();
    Rate rate = buildRate(rateId);
    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));

    RateResponse res = service.get(rateId);
    assertThat(res.name()).isEqualTo("Rate 1");
  }

  @Test
  void get_NotFound() {
    UUID rateId = UUID.randomUUID();
    when(rateRepository.findById(rateId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(rateId))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Tarifa no encontrada");
  }

  @Test
  void create_Success() throws Exception {
    UUID siteId = UUID.randomUUID();
    RateUpsertRequest req = buildRequest(siteId);

    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    site.setCode("S1");

    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(rateRepository.findActiveForConflictCheck(any(), any(), any(), any())).thenReturn(List.of());
    when(rateRepository.save(any())).thenAnswer(i -> {
      Rate r = i.getArgument(0);
      if (r.getId() == null) r.setId(UUID.randomUUID());
      return r;
    });

    RateResponse res = service.create(req);
    assertThat(res.name()).isEqualTo("Rate 1");
    verify(settingsAuditService).log(eq(AuthAuditAction.SETTINGS_RATE_CREATE), eq("OK"), any());
  }

  @Test
  void create_Duplicate() {
    UUID siteId = UUID.randomUUID();
    RateUpsertRequest req = buildRequest(siteId);

    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    site.setCode("S1");

    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(rateRepository.findActiveForConflictCheck(any(), any(), any(), any())).thenReturn(List.of());
    when(rateRepository.save(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Ya existe una tarifa activa");
  }

  @Test
  void update_Success() throws Exception {
    UUID rateId = UUID.randomUUID();
    UUID siteId = UUID.randomUUID();
    Rate rate = buildRate(rateId);

    RateUpsertRequest req = buildRequest(siteId);

    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    site.setCode("S1");

    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(rateRepository.findActiveForConflictCheck(any(), any(), any(), any())).thenReturn(List.of());
    when(rateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    RateResponse res = service.update(rateId, req);
    assertThat(res.name()).isEqualTo("Rate 1");
    verify(settingsAuditService).log(eq(AuthAuditAction.SETTINGS_RATE_UPDATE), eq("OK"), any());
  }

  @Test
  void update_NotFound() {
    UUID rateId = UUID.randomUUID();
    RateUpsertRequest req = buildRequest(null);
    when(rateRepository.findById(rateId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.update(rateId, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Tarifa no encontrada");
  }

  @Test
  void patchStatus_Success() {
    UUID rateId = UUID.randomUUID();
    Rate rate = buildRate(rateId);
    rate.setActive(true);

    RateStatusRequest req = new RateStatusRequest(false);

    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));
    when(rateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    RateResponse res = service.patchStatus(rateId, req);
    assertThat(res.active()).isFalse();
    verify(settingsAuditService).log(eq(AuthAuditAction.SETTINGS_RATE_STATUS), eq("OK"), any());
  }

  @Test
  void delete_Success() {
    UUID rateId = UUID.randomUUID();
    Rate rate = buildRate(rateId);

    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));
    when(parkingSessionRepository.countByRate_IdAndCompanyId(rateId, companyId)).thenReturn(0L);
    when(rateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    RateResponse res = service.delete(rateId);
    assertThat(res.active()).isFalse();
    verify(settingsAuditService).log(eq(AuthAuditAction.SETTINGS_RATE_DELETE), eq("OK"), any());
  }

  @Test
  void delete_WithSessions_ThrowsConflict() {
    UUID rateId = UUID.randomUUID();
    Rate rate = buildRate(rateId);

    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));
    when(parkingSessionRepository.countByRate_IdAndCompanyId(rateId, companyId)).thenReturn(5L);

    assertThatThrownBy(() -> service.delete(rateId))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("existen sesiones asociadas");
  }
}
