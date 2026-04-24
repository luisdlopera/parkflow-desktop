package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.VehicleType;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import com.parkflow.modules.settings.service.SettingsAuditService;
import com.parkflow.modules.settings.service.SettingsRateService;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class SettingsRateServiceTest {

  @Mock private RateRepository rateRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private SettingsAuditService settingsAuditService;

  private SettingsRateService service;

  @BeforeEach
  void setUp() {
    service = new SettingsRateService(rateRepository, parkingSessionRepository, settingsAuditService);
  }

  @Test
  void createPersistsWhenNoConflict() {
    when(rateRepository.findActiveForConflictCheck(eq("DEFAULT"), eq(VehicleType.CAR), any(UUID.class)))
        .thenReturn(List.of());
    Rate saved = new Rate();
    saved.setId(UUID.randomUUID());
    saved.setName("Tarifa OK");
    saved.setSite("DEFAULT");
    saved.setVehicleType(VehicleType.CAR);
    saved.setRateType(RateType.HOURLY);
    saved.setAmount(new java.math.BigDecimal("1000.00"));
    saved.setActive(true);
    when(rateRepository.save(any(Rate.class))).thenReturn(saved);

    RateUpsertRequest req =
        new RateUpsertRequest(
            "Tarifa OK",
            VehicleType.CAR,
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
            null,
            null,
            null);

    service.create(req);
    verify(rateRepository).save(any(Rate.class));
    verify(settingsAuditService).log(any(), eq("OK"), any());
  }

  @Test
  void createRejectsPartialScheduledRange() {
    RateUpsertRequest req =
        new RateUpsertRequest(
            "X",
            VehicleType.CAR,
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
    Rate existing = new Rate();
    existing.setId(UUID.randomUUID());
    existing.setSite("DEFAULT");
    existing.setVehicleType(VehicleType.CAR);
    existing.setRateType(RateType.HOURLY);
    existing.setActive(true);
    existing.setWindowStart(LocalTime.of(8, 0));
    existing.setWindowEnd(LocalTime.of(12, 0));

    when(rateRepository.findActiveForConflictCheck(
            eq("DEFAULT"), eq(VehicleType.CAR), any(UUID.class)))
        .thenReturn(List.of(existing));

    RateUpsertRequest req =
        new RateUpsertRequest(
            "Tarifa 2",
            VehicleType.CAR,
            RateType.HOURLY,
            new BigDecimal("5000.00"),
            0,
            0,
            60,
            RoundingMode.UP,
            BigDecimal.ZERO,
            true,
            "DEFAULT",
            LocalTime.of(9, 0),
            LocalTime.of(13, 0),
            null,
            null);

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }
}
