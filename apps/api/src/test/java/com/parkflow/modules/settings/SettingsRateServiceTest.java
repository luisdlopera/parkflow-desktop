package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import com.parkflow.modules.settings.application.service.SettingsAuditService;
import com.parkflow.modules.settings.application.service.SettingsRateService;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class SettingsRateServiceTest {

  @Mock private RatePort rateRepository;
  @Mock private com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort vehicleTypeRepository;
  @Mock private ParkingSessionPort parkingSessionRepository;
  @Mock private SettingsAuditService settingsAuditService;
  @Mock private ParkingSitePort parkingSiteRepository;
  @Mock private com.parkflow.modules.audit.service.AuditService globalAuditService;
  @Mock private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  private SettingsRateService service;

  @BeforeEach
  void setUp() {
    service = new SettingsRateService(rateRepository, parkingSessionRepository, settingsAuditService, vehicleTypeRepository, parkingSiteRepository, globalAuditService, objectMapper);
    UUID companyId = UUID.randomUUID();
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(),
        companyId,
        "admin@test.com",
        UserRole.ADMIN.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void createPersistsWhenNoConflict() {
    when(rateRepository.findActiveForConflictCheck(eq("DEFAULT"), eq("CAR"), any(UUID.class), any(UUID.class)))
        .thenReturn(List.of());
    MasterVehicleType carType = new MasterVehicleType();
    carType.setCode("CAR");
    carType.setName("Carro");
    when(vehicleTypeRepository.findByCode("CAR")).thenReturn(java.util.Optional.of(carType));
    Rate saved = new Rate();
    saved.setId(UUID.randomUUID());
    saved.setName("Tarifa OK");
    saved.setSite("DEFAULT");
    saved.setVehicleType("CAR");
    saved.setRateType(RateType.HOURLY);
    saved.setAmount(new java.math.BigDecimal("1000.00"));
    saved.setActive(true);
    when(rateRepository.save(any(Rate.class))).thenReturn(saved);

    RateUpsertRequest req =
        new RateUpsertRequest(
            "Tarifa OK",
            "CAR",
            null,
            RateType.HOURLY,
            new BigDecimal("1000.00"),
            5,
            0,
            60,
            RoundingMode.UP,
            BigDecimal.ZERO,
            true,
            "DEFAULT",
            null,
            BigDecimal.ZERO,
            0,
            BigDecimal.ZERO,
            0,
            null,
            null,
            null,
            false,
            BigDecimal.ZERO,
            false,
            BigDecimal.ZERO,
            null,
            null,
            null,
            null,
            null);

    service.create(req);
    verify(rateRepository).save(any(Rate.class));
    verify(settingsAuditService).log(any(), eq("OK"), any());
  }

  @Test
  void createUsesSiteRefCodeWhenAvailable() {
    UUID siteId = UUID.randomUUID();
    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    site.setCode("HQ");
    when(parkingSiteRepository.findById(siteId)).thenReturn(java.util.Optional.of(site));
    when(rateRepository.findActiveForConflictCheck(eq("HQ"), eq("CAR"), any(UUID.class), any(UUID.class)))
        .thenReturn(List.of());
    MasterVehicleType carType = new MasterVehicleType();
    carType.setCode("CAR");
    carType.setName("Carro");
    when(vehicleTypeRepository.findByCode("CAR")).thenReturn(java.util.Optional.of(carType));
    when(rateRepository.save(any(Rate.class))).thenAnswer(invocation -> {
      Rate r = invocation.getArgument(0);
      r.setId(UUID.randomUUID());
      return r;
    });

    RateUpsertRequest req =
        new RateUpsertRequest(
            "Tarifa HQ",
            "CAR",
            null,
            RateType.HOURLY,
            new BigDecimal("1000.00"),
            5,
            0,
            60,
            RoundingMode.UP,
            BigDecimal.ZERO,
            true,
            "legacy",
            siteId,
            BigDecimal.ZERO,
            0,
            BigDecimal.ZERO,
            0,
            null,
            null,
            null,
            false,
            BigDecimal.ZERO,
            false,
            BigDecimal.ZERO,
            null,
            null,
            null,
            null,
            null);

    var response = service.create(req);

    assertThat(response.site()).isEqualTo("HQ");
    assertThat(response.siteId()).isEqualTo(siteId);
  }

  @Test
  void createRejectsPartialScheduledRange() {
    RateUpsertRequest req =
        new RateUpsertRequest(
            "X",
            "CAR",
            null,
            RateType.HOURLY,
            new BigDecimal("1000.00"),
            0,
            0,
            60,
            RoundingMode.UP,
            BigDecimal.ZERO,
            true,
            "DEFAULT",
            null,
            BigDecimal.ZERO,
            0,
            BigDecimal.ZERO,
            0,
            null,
            null,
            null,
            false,
            BigDecimal.ZERO,
            false,
            BigDecimal.ZERO,
            null,
            null,
            null,
            OffsetDateTime.parse("2026-05-01T00:00:00Z"),
            null);

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
  }

  @Test
  void createRejectsOverlappingActiveWindows() {
    MasterVehicleType carType = new MasterVehicleType();
    carType.setCode("CAR");
    carType.setName("Carro");
    when(vehicleTypeRepository.findByCode("CAR")).thenReturn(java.util.Optional.of(carType));
    Rate existing = new Rate();
    existing.setId(UUID.randomUUID());
    existing.setSite("DEFAULT");
    existing.setVehicleType("CAR");
    existing.setRateType(RateType.HOURLY);
    existing.setActive(true);
    existing.setWindowStart(LocalTime.of(8, 0));
    existing.setWindowEnd(LocalTime.of(12, 0));

    when(rateRepository.findActiveForConflictCheck(
            eq("DEFAULT"), eq("CAR"), any(UUID.class), any(UUID.class)))
        .thenReturn(List.of(existing));

    RateUpsertRequest req =
        new RateUpsertRequest(
            "Tarifa 2",
            "CAR",
            null,
            RateType.HOURLY,
            new BigDecimal("5000.00"),
            0,
            0,
            60,
            RoundingMode.UP,
            BigDecimal.ZERO,
            true,
            "DEFAULT",
            null,
            BigDecimal.ZERO,
            0,
            BigDecimal.ZERO,
            0,
            null,
            null,
            null,
            false,
            BigDecimal.ZERO,
            false,
            BigDecimal.ZERO,
            null,
            LocalTime.of(9, 0),
            LocalTime.of(13, 0),
            null,
            null);

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void listNormalizesSearchTextBeforeDelegating() {
    when(rateRepository.search(eq("DEFAULT"), eq("Tarifa"), eq(Boolean.TRUE), any(), any(UUID.class), any()))
        .thenReturn(org.springframework.data.domain.Page.empty());

    service.list(" DEFAULT ", " Tarifa ", true, null, org.springframework.data.domain.PageRequest.of(0, 20));

    verify(rateRepository).search(eq("DEFAULT"), eq("Tarifa"), eq(Boolean.TRUE), any(), any(UUID.class), any());
  }

  @Test
  void deleteDeactivatesInsteadOfRemoving() {
    Rate rate = new Rate();
    rate.setId(UUID.randomUUID());
    rate.setName("Tarifa 1");
    rate.setActive(true);
    when(rateRepository.findById(rate.getId())).thenReturn(java.util.Optional.of(rate));
    when(parkingSessionRepository.countByRate_IdAndCompanyId(rate.getId(), com.parkflow.modules.auth.security.TenantContext.getTenantId())).thenReturn(0L);
    when(rateRepository.save(any(Rate.class))).thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.delete(rate.getId());

    assertThat(response.active()).isFalse();
    verify(rateRepository).save(any(Rate.class));
  }
}
