package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.repository.PaymentMethodPort;
import com.parkflow.modules.configuration.application.service.PaymentMethodManagementService;
import com.parkflow.modules.common.exception.OperationException;
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

  @Mock private PaymentMethodPort paymentMethodRepository;

  private PaymentMethodManagementService service;

  @BeforeEach
  void setUp() {
    service = new PaymentMethodManagementService(paymentMethodRepository);
  }

  @Test
  void createNormalizesCodeAndName() {
    PaymentMethodRequest req = new PaymentMethodRequest(" cash ", "  Efectivo ", false, true, 1);
    UUID companyId = UUID.randomUUID();
    when(paymentMethodRepository.existsByCodeAndCompany("CASH", companyId)).thenReturn(false);
    when(paymentMethodRepository.save(any(PaymentMethod.class)))
        .thenAnswer(invocation -> {
          PaymentMethod entity = invocation.getArgument(0);
          entity.setId(UUID.randomUUID());
          return entity;
        });

    var response = service.create(req, companyId);

    assertThat(response.code()).isEqualTo("CASH");
    assertThat(response.name()).isEqualTo("Efectivo");
    verify(paymentMethodRepository).save(any(PaymentMethod.class));
  }

  @Test
  void createFailsWhenCodeAlreadyExists() {
    UUID companyId = UUID.randomUUID();
    when(paymentMethodRepository.existsByCodeAndCompany("CASH", companyId)).thenReturn(true);

    assertThatThrownBy(() -> service.create(new PaymentMethodRequest("CASH", "Efectivo", false, true, 1), companyId))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void listDelegatesFiltersToRepositorySearch() {
    PaymentMethod entity = new PaymentMethod();
    entity.setId(UUID.randomUUID());
    entity.setCode("CASH");
    entity.setName("Efectivo");
    when(paymentMethodRepository.search(any(), any(), any(), any()))
        .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 20), 1));

    UUID companyId = UUID.randomUUID();
    var page = service.list(" Efectivo ", true, companyId, PageRequest.of(0, 20));

    assertThat(page.content()).hasSize(1);
    assertThat(page.content().get(0).code()).isEqualTo("CASH");
    verify(paymentMethodRepository).search(eq("Efectivo"), eq(Boolean.TRUE), eq(companyId), any());
  }

  @Test
  void updateRejectsDuplicateNormalizedCode() {
    PaymentMethod current = new PaymentMethod();
    current.setId(UUID.randomUUID());
    current.setCode("CASH");
    UUID companyId = UUID.randomUUID();
    when(paymentMethodRepository.findById(current.getId())).thenReturn(Optional.of(current));
    when(paymentMethodRepository.existsByCodeAndCompany("CARD", companyId)).thenReturn(true);

    assertThatThrownBy(() -> service.update(current.getId(), new PaymentMethodRequest(" card ", "Tarjeta", true, true, 2), companyId))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void patchStatusUpdatesActiveFlag() {
    PaymentMethod current = new PaymentMethod();
    current.setId(UUID.randomUUID());
    current.setCode("CASH");
    current.setActive(true);
    UUID companyId = UUID.randomUUID();
    when(paymentMethodRepository.findById(current.getId())).thenReturn(Optional.of(current));
    when(paymentMethodRepository.save(any(PaymentMethod.class))).thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.patchStatus(current.getId(), false, companyId);

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
