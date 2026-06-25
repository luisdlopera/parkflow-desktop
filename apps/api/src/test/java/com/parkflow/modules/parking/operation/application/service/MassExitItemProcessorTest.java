package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.MassExitFilterRequest;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult.MassExitItemStatus;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MassExitItemProcessorTest {

  @Mock private RegisterExitUseCase registerExitUseCase;
  private MassExitItemProcessor processor;

  @BeforeEach
  void setUp() {
    processor = new MassExitItemProcessor(registerExitUseCase);
  }

  @Test
  void processesFreeExitSuccessfully() {
    ParkingSession session = ParkingSession.builder()
        .ticketNumber("T-1")
        .plate("ABC123")
        .entryAt(OffsetDateTime.now().minusHours(1))
        .vehicle(new Vehicle())
        .build();

    MassExitFilterRequest req = new MassExitFilterRequest(
        MassExitFilterRequest.ChargeMode.FREE, null, "Reason", null, null,
        null, null, null, UUID.randomUUID(), null, null
    );

    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());

    when(registerExitUseCase.execute(any(), anyBoolean()))
        .thenReturn(new OperationResultResponse(null, null, "ok", BigDecimal.valueOf(1000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(1000)));

    MassExitItemResult result = processor.processOne(session, req, operator, "batch-1");

    assertThat(result.status()).isEqualTo(MassExitItemStatus.SUCCESS);
    assertThat(result.amountCharged()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(result.ticketNumber()).isEqualTo("T-1");
  }

  @Test
  void processesStandardExitSuccessfully() {
    ParkingSession session = ParkingSession.builder()
        .ticketNumber("T-2")
        .plate("XYZ789")
        .entryAt(OffsetDateTime.now().minusHours(1))
        .vehicle(new Vehicle())
        .build();

    MassExitFilterRequest req = new MassExitFilterRequest(
        MassExitFilterRequest.ChargeMode.NORMAL, null, "Reason", null, null,
        null, null, null, UUID.randomUUID(), null, com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH
    );

    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());

    when(registerExitUseCase.execute(any(), anyBoolean()))
        .thenReturn(new OperationResultResponse(null, null, "ok", BigDecimal.valueOf(5000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(5000)));

    MassExitItemResult result = processor.processOne(session, req, operator, "batch-1");

    assertThat(result.status()).isEqualTo(MassExitItemStatus.SUCCESS);
    assertThat(result.amountCharged()).isEqualByComparingTo(BigDecimal.valueOf(5000));
  }

  @Test
  void processesFailedExitGracefully() {
    ParkingSession session = ParkingSession.builder()
        .ticketNumber("T-3")
        .plate("DEF456")
        .entryAt(OffsetDateTime.now().minusHours(1))
        .vehicle(new Vehicle())
        .build();

    MassExitFilterRequest req = new MassExitFilterRequest(
        MassExitFilterRequest.ChargeMode.FREE, null, "Reason", null, null,
        null, null, null, UUID.randomUUID(), null, null
    );

    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());

    when(registerExitUseCase.execute(any(), anyBoolean()))
        .thenThrow(new RuntimeException("System error"));

    MassExitItemResult result = processor.processOne(session, req, operator, "batch-1");

    assertThat(result.status()).isEqualTo(MassExitItemStatus.FAILED);
    assertThat(result.errorMessage()).contains("System error");
    assertThat(result.amountCharged()).isEqualByComparingTo(BigDecimal.ZERO);
  }
}
