package com.parkflow.modules.configuration.service;

import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.dto.PaymentMethodResponse;
import com.parkflow.modules.configuration.entity.PaymentMethod;
import com.parkflow.modules.configuration.repository.PaymentMethodRepository;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentMethodService {

  private final PaymentMethodRepository paymentMethodRepository;

  @Transactional(readOnly = true)
  public SettingsPageResponse<PaymentMethodResponse> list(String q, Boolean active, Pageable pageable) {
    Page<PaymentMethod> page = paymentMethodRepository.search(q, active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public PaymentMethodResponse get(UUID id) {
    return toResponse(findById(id));
  }

  @Transactional
  public PaymentMethodResponse create(PaymentMethodRequest req) {
    if (paymentMethodRepository.existsByCode(req.code())) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un método de pago con este código");
    }
    PaymentMethod pm = new PaymentMethod();
    pm.setCode(req.code().trim().toUpperCase());
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

  @Transactional
  public PaymentMethodResponse update(UUID id, PaymentMethodRequest req) {
    PaymentMethod pm = findById(id);
    if (!pm.getCode().equalsIgnoreCase(req.code()) && paymentMethodRepository.existsByCode(req.code())) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un método de pago con este código");
    }
    pm.setCode(req.code().trim().toUpperCase());
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
}
