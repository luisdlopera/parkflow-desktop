package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.application.port.in.PaymentMethodUseCase;
import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.dto.PaymentMethodResponse;
import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.repository.PaymentMethodPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentMethodManagementService implements PaymentMethodUseCase {

  private final PaymentMethodPort paymentMethodRepository;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<PaymentMethodResponse> list(String q, Boolean active, Pageable pageable) {
    Page<PaymentMethod> page = paymentMethodRepository.search(normalizeQuery(q), active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public PaymentMethodResponse get(UUID id) {
    return toResponse(findById(id));
  }

  @Override
  @Transactional
  public PaymentMethodResponse create(PaymentMethodRequest req) {
    String code = req.code().trim().toUpperCase();
    if (paymentMethodRepository.existsByCode(code)) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un método de pago con este código");
    }
    PaymentMethod pm = new PaymentMethod();
    pm.setCode(code);
    pm.setName(req.name().trim());
    pm.setRequiresReference(req.requiresReference());
    pm.setActive(req.isActive());
    pm.setDisplayOrder(req.displayOrder());
    pm.setCreatedAt(OffsetDateTime.now());
    pm.setUpdatedAt(OffsetDateTime.now());
    try {
      pm = paymentMethodRepository.save(pm);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Código duplicado");
    }
    return toResponse(pm);
  }

  @Override
  @Transactional
  public PaymentMethodResponse update(UUID id, PaymentMethodRequest req) {
    PaymentMethod pm = findById(id);
    String code = req.code().trim().toUpperCase();
    if (!pm.getCode().equalsIgnoreCase(code) && paymentMethodRepository.existsByCode(code)) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un método de pago con este código");
    }
    pm.setCode(code);
    pm.setName(req.name().trim());
    pm.setRequiresReference(req.requiresReference());
    pm.setActive(req.isActive());
    pm.setDisplayOrder(req.displayOrder());
    try {
      pm = paymentMethodRepository.save(pm);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Código duplicado");
    }
    return toResponse(pm);
  }

  @Override
  @Transactional
  public PaymentMethodResponse patchStatus(UUID id, boolean active) {
    PaymentMethod pm = findById(id);
    pm.setActive(active);
    return toResponse(paymentMethodRepository.save(pm));
  }

  private PaymentMethod findById(UUID id) {
    return paymentMethodRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Método de pago no encontrado"));
  }

  private PaymentMethodResponse toResponse(PaymentMethod pm) {
    return new PaymentMethodResponse(
        pm.getId(), pm.getCode(), pm.getName(), pm.isRequiresReference(),
        pm.isActive(), pm.getDisplayOrder(), pm.getCreatedAt(), pm.getUpdatedAt());
  }

  private static String normalizeQuery(String q) {
    return q == null || q.isBlank() ? null : q.trim();
  }
}
