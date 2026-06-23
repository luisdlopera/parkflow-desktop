package com.parkflow.modules.configuration.domain.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateDomainServiceTest {

  private RatePort ratePort;
  private RateDomainService service;

  @BeforeEach
  void setUp() {
    ratePort = mock(RatePort.class);
    service = new RateDomainService(ratePort);
  }

  @Test
  void validateSchedule_ShouldThrowIfOnlyFrom() {
    Rate rate = new Rate();
    rate.setScheduledActiveFrom(OffsetDateTime.now());
    assertThrows(OperationException.class, () -> service.validateRate(rate, null, null));
  }

  @Test
  void validateSchedule_ShouldThrowIfFromAfterTo() {
    Rate rate = new Rate();
    rate.setScheduledActiveFrom(OffsetDateTime.now().plusDays(1));
    rate.setScheduledActiveTo(OffsetDateTime.now());
    assertThrows(OperationException.class, () -> service.validateRate(rate, null, null));
  }

  @Test
  void validateMinMax_ShouldThrowIfMinGreaterThanMax() {
    Rate rate = new Rate();
    rate.setMinSessionValue(BigDecimal.TEN);
    rate.setMaxSessionValue(BigDecimal.ONE);
    assertThrows(OperationException.class, () -> service.validateRate(rate, null, null));
  }

  @Test
  void checkConflicts_ShouldPassIfInactive() {
    Rate rate = new Rate();
    rate.setActive(false);
    assertDoesNotThrow(() -> service.validateRate(rate, null, null));
  }

  @Test
  void checkConflicts_ShouldThrowIfWindowIncomplete() {
    Rate rate = new Rate();
    rate.setActive(true);
    rate.setRateType(RateType.FLAT);
    rate.setWindowStart(LocalTime.of(8, 0));
    
    when(ratePort.findActiveForConflictCheck(any(), any(), any(), any())).thenReturn(List.of(rate));
    
    assertThrows(OperationException.class, () -> service.validateRate(rate, null, null));
  }

  @Test
  void checkConflicts_ShouldThrowIfEndBeforeStart() {
    Rate rate = new Rate();
    rate.setActive(true);
    rate.setRateType(RateType.FLAT);
    rate.setWindowStart(LocalTime.of(18, 0));
    rate.setWindowEnd(LocalTime.of(8, 0));
    
    when(ratePort.findActiveForConflictCheck(any(), any(), any(), any())).thenReturn(List.of(rate));
    
    assertThrows(OperationException.class, () -> service.validateRate(rate, null, null));
  }

  @Test
  void checkConflicts_ShouldThrowOnOverlap() {
    Rate r1 = new Rate();
    r1.setActive(true);
    r1.setRateType(RateType.FLAT);
    r1.setWindowStart(LocalTime.of(8, 0));
    r1.setWindowEnd(LocalTime.of(12, 0));
    
    Rate r2 = new Rate();
    r2.setActive(true);
    r2.setRateType(RateType.FLAT);
    r2.setWindowStart(LocalTime.of(10, 0));
    r2.setWindowEnd(LocalTime.of(14, 0));
    
    when(ratePort.findActiveForConflictCheck(any(), any(), any(), any())).thenReturn(List.of(r2));
    
    assertThrows(OperationException.class, () -> service.validateRate(r1, null, null));
  }

  @Test
  void checkConflicts_ShouldPassIfNotOverlapping() {
    Rate r1 = new Rate();
    r1.setActive(true);
    r1.setRateType(RateType.FLAT);
    r1.setWindowStart(LocalTime.of(8, 0));
    r1.setWindowEnd(LocalTime.of(10, 0));
    
    Rate r2 = new Rate();
    r2.setActive(true);
    r2.setRateType(RateType.FLAT);
    r2.setWindowStart(LocalTime.of(10, 0));
    r2.setWindowEnd(LocalTime.of(12, 0));
    
    when(ratePort.findActiveForConflictCheck(any(), any(), any(), any())).thenReturn(List.of(r2));
    
    assertDoesNotThrow(() -> service.validateRate(r1, null, null));
  }
}
