package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.dto.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BulkExitServiceTest {

  @Mock private RegisterExitUseCase registerExitUseCase;

  private BulkExitService service;
  private final UUID operatorId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new BulkExitService(registerExitUseCase);
  }

  private ReceiptResponse sampleReceipt(String ticket, String plate) {
    return new ReceiptResponse(ticket, plate, "CAR", null, null, null, null,
        null, null, null, null, 120, "2h 0m",
        BigDecimal.valueOf(4000), null,
        com.parkflow.modules.parking.operation.domain.SessionStatus.CLOSED,
        false, 0, null, null, null, null, false, null, null, null, null, null, false, null);
  }

  // =========================================================================
  // PRECALCULATE
  // =========================================================================

  @Nested
  class Precalculate {

    @Test
    void calculatesAllVehiclesSuccessfully() {
      OperationResultResponse r1 = new OperationResultResponse("s1", sampleReceipt("T-1", "ABC123"),
          "ok", BigDecimal.valueOf(2000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(2000));
      OperationResultResponse r2 = new OperationResultResponse("s2", sampleReceipt("T-2", "XYZ789"),
          "ok", BigDecimal.valueOf(3000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(3000));
      when(registerExitUseCase.precalculate(any())).thenReturn(r1, r2);

      BulkExitRequest req = new BulkExitRequest(List.of("T-1", "T-2"), operatorId, PaymentMethod.CASH, null, null, null);
      BulkExitCalculateResponse result = service.precalculate(req);

      assertThat(result.totalVehicles()).isEqualTo(2);
      assertThat(result.finalTotal()).isEqualByComparingTo(BigDecimal.valueOf(5000));
      assertThat(result.items()).hasSize(2);
      assertThat(result.errors()).isEmpty();
    }

    @Test
    void handlesPartialFailuresGracefully() {
      when(registerExitUseCase.precalculate(any()))
          .thenThrow(new RuntimeException("Session not found"))
          .thenReturn(new OperationResultResponse("s2", sampleReceipt("T-2", "XYZ789"),
              "ok", BigDecimal.valueOf(3000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(3000)));

      BulkExitRequest req = new BulkExitRequest(List.of("T-INVALID", "T-2"), operatorId, PaymentMethod.CASH, null, null, null);
      BulkExitCalculateResponse result = service.precalculate(req);

      assertThat(result.errors()).hasSize(1);
      assertThat(result.errors().get(0)).contains("T-INVALID");
      assertThat(result.finalTotal()).isEqualByComparingTo(BigDecimal.valueOf(3000));
    }

    @Test
    void handlesEmptyLocators() {
      BulkExitRequest req = new BulkExitRequest(List.of(), operatorId, PaymentMethod.CASH, null, null, null);
      BulkExitCalculateResponse result = service.precalculate(req);

      assertThat(result.totalVehicles()).isEqualTo(0);
      assertThat(result.finalTotal()).isEqualByComparingTo(BigDecimal.ZERO);
    }
  }

  // =========================================================================
  // PROCESS
  // =========================================================================

  @Nested
  class Process {

    @Test
    void processesAllVehiclesSuccessfully() {
      OperationResultResponse r1 = new OperationResultResponse("s1", sampleReceipt("T-1", "ABC123"),
          "Salida registrada", BigDecimal.valueOf(2000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(2000));
      OperationResultResponse r2 = new OperationResultResponse("s2", sampleReceipt("T-2", "XYZ789"),
          "Salida registrada", BigDecimal.valueOf(3000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(3000));
      when(registerExitUseCase.execute(any())).thenReturn(r1, r2);

      BulkExitRequest req = new BulkExitRequest(List.of("T-1", "T-2"), operatorId, PaymentMethod.CASH, null, null, null);
      BulkExitResponse result = service.process(req);

      assertThat(result.successfulCount()).isEqualTo(2);
      assertThat(result.failedCount()).isEqualTo(0);
      assertThat(result.totalCharged()).isEqualByComparingTo(BigDecimal.valueOf(5000));
      assertThat(result.errors()).isEmpty();
    }

    @Test
    void throwsWhenAnyVehicleFails() {
      when(registerExitUseCase.execute(any()))
          .thenThrow(new RuntimeException("Lock wait timeout"))
          .thenReturn(new OperationResultResponse("s2", sampleReceipt("T-2", "XYZ789"),
              "ok", BigDecimal.valueOf(3000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(3000)));

      BulkExitRequest req = new BulkExitRequest(List.of("T-1", "T-2"), operatorId, PaymentMethod.CASH, null, null, null);

      assertThatThrownBy(() -> service.process(req))
          .isInstanceOf(RuntimeException.class)
          .hasMessageContaining("Bulk exit partially failed");
    }
  }
}
