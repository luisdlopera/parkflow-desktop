package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.configuration.application.port.in.PaymentMethodUseCase;
import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.dto.PaymentMethodResponse;
import com.parkflow.modules.common.dto.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/payment-methods")
@RequiredArgsConstructor
public class ConfigurationPaymentMethodController {

  private final PaymentMethodUseCase paymentMethodUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PageResponse<PaymentMethodResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    UUID companyId = TenantContext.getTenantId();
    return paymentMethodUseCase.list(q, active, companyId, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PaymentMethodResponse get(@PathVariable UUID id) {
    return paymentMethodUseCase.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public PaymentMethodResponse create(@Valid @RequestBody PaymentMethodRequest req) {
    UUID companyId = TenantContext.getTenantId();
    return paymentMethodUseCase.create(req, companyId);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public PaymentMethodResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody PaymentMethodRequest req) {
    UUID companyId = TenantContext.getTenantId();
    return paymentMethodUseCase.update(id, req, companyId);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public PaymentMethodResponse patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    UUID companyId = TenantContext.getTenantId();
    return paymentMethodUseCase.patchStatus(id, active, companyId);
  }
}
