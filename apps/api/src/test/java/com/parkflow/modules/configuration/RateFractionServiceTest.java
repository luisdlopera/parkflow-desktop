package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.RateFractionRequest;
import com.parkflow.modules.configuration.entity.RateFraction;
import com.parkflow.modules.configuration.repository.RateFractionRepository;
import com.parkflow.modules.configuration.application.service.RateFractionManagementService;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class RateFractionServiceTest {
  @Mock private RateFractionRepository rateFractionRepository;
  @Mock private RateRepository rateRepository;

  private RateFractionManagementService service;

  @BeforeEach
  void setUp() {
    service = new RateFractionManagementService(rateFractionRepository, rateRepository);
  }

  @Test
  void createFailsWhenRangeIsInvalid() {
    UUID rateId = UUID.randomUUID();
    Rate rate = new Rate();
    rate.setId(rateId);
    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));

    RateFractionRequest req = new RateFractionRequest(30, 30, BigDecimal.TEN, false, true);

    assertThatThrownBy(() -> service.create(rateId, req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
  }

  @Test
  void createFailsOnOverlap() {
    UUID rateId = UUID.randomUUID();
    Rate rate = new Rate();
    rate.setId(rateId);
    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));

    RateFraction existing = new RateFraction();
    existing.setId(UUID.randomUUID());
    existing.setFromMinute(0);
    existing.setToMinute(60);
    when(rateFractionRepository.findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(rateId))
        .thenReturn(List.of(existing));

    RateFractionRequest req = new RateFractionRequest(30, 90, BigDecimal.TEN, false, true);

    assertThatThrownBy(() -> service.create(rateId, req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void createSucceedsWhenNonOverlapping() {
    UUID rateId = UUID.randomUUID();
    Rate rate = new Rate();
    rate.setId(rateId);
    when(rateRepository.findById(rateId)).thenReturn(Optional.of(rate));
    when(rateFractionRepository.findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(rateId))
        .thenReturn(List.of());
    when(rateFractionRepository.save(any(RateFraction.class))).thenAnswer(invocation -> {
      RateFraction rf = invocation.getArgument(0);
      rf.setId(UUID.randomUUID());
      return rf;
    });

    var response = service.create(rateId, new RateFractionRequest(0, 30, BigDecimal.ONE, true, true));

    assertThat(response.rateId()).isEqualTo(rateId);
    assertThat(response.fromMinute()).isEqualTo(0);
    assertThat(response.toMinute()).isEqualTo(30);
  }
}
