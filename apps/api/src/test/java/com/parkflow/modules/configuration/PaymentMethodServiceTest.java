package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.entity.PaymentMethod;
import com.parkflow.modules.configuration.repository.PaymentMethodRepository;
import com.parkflow.modules.configuration.service.PaymentMethodService;
import com.parkflow.modules.parking.operation.exception.OperationException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class PaymentMethodServiceTest {

  @Mock private PaymentMethodRepository paymentMethodRepository;

  private PaymentMethodService service;

  @BeforeEach
  void setUp() {
    service = new PaymentMethodService(paymentMethodRepository);
  }

  @Test
  void createNormalizesCodeAndName() {
    PaymentMethodRequest req = new PaymentMethodRequest(" cash ", "  Efectivo ", false, true, 1);
    when(paymentMethodRepository.existsByCode(" cash ")).thenReturn(false);
    when(paymentMethodRepository.save(any(PaymentMethod.class)))
        .thenAnswer(invocation -> {
          PaymentMethod entity = invocation.getArgument(0);
          entity.setId(UUID.randomUUID());
          return entity;
        });

    var response = service.create(req);

    assertThat(response.code()).isEqualTo("CASH");
    assertThat(response.name()).isEqualTo("Efectivo");
    verify(paymentMethodRepository).save(any(PaymentMethod.class));
  }

  @Test
  void createFailsWhenCodeAlreadyExists() {
    when(paymentMethodRepository.existsByCode("CASH")).thenReturn(true);

    assertThatThrownBy(() -> service.create(new PaymentMethodRequest("CASH", "Efectivo", false, true, 1)))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void getFailsWhenEntityNotFound() {
    UUID id = UUID.randomUUID();
    when(paymentMethodRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(id))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
  }
}
