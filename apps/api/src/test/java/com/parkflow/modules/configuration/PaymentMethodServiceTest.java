package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.entity.PaymentMethod;
import com.parkflow.modules.configuration.repository.PaymentMethodRepository;
import com.parkflow.modules.configuration.service.PaymentMethodService;
import com.parkflow.modules.parking.operation.exception.OperationException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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
    when(paymentMethodRepository.existsByCode("CASH")).thenReturn(false);
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
  void listDelegatesFiltersToRepositorySearch() {
    PaymentMethod entity = new PaymentMethod();
    entity.setId(UUID.randomUUID());
    entity.setCode("CASH");
    entity.setName("Efectivo");
    when(paymentMethodRepository.search(any(), any(), any()))
        .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 20), 1));

    var page = service.list(" Efectivo ", true, PageRequest.of(0, 20));

    assertThat(page.content()).hasSize(1);
    assertThat(page.content().get(0).code()).isEqualTo("CASH");
    verify(paymentMethodRepository).search(eq("Efectivo"), eq(Boolean.TRUE), any());
  }

  @Test
  void updateRejectsDuplicateNormalizedCode() {
    PaymentMethod current = new PaymentMethod();
    current.setId(UUID.randomUUID());
    current.setCode("CASH");
    when(paymentMethodRepository.findById(current.getId())).thenReturn(Optional.of(current));
    when(paymentMethodRepository.existsByCode("CARD")).thenReturn(true);

    assertThatThrownBy(() -> service.update(current.getId(), new PaymentMethodRequest(" card ", "Tarjeta", true, true, 2)))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void patchStatusUpdatesActiveFlag() {
    PaymentMethod current = new PaymentMethod();
    current.setId(UUID.randomUUID());
    current.setCode("CASH");
    current.setActive(true);
    when(paymentMethodRepository.findById(current.getId())).thenReturn(Optional.of(current));
    when(paymentMethodRepository.save(any(PaymentMethod.class))).thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.patchStatus(current.getId(), false);

    assertThat(response.isActive()).isFalse();
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
