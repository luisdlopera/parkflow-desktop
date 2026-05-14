package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.PaymentMethodUseCase;
import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.dto.PaymentMethodResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/payment-methods")
@RequiredArgsConstructor
public class ConfigurationPaymentMethodController {

  private final PaymentMethodUseCase paymentMethodUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<PaymentMethodResponse>> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(paymentMethodUseCase.list(q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<PaymentMethodResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(paymentMethodUseCase.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PaymentMethodResponse> create(@Valid @RequestBody PaymentMethodRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(paymentMethodUseCase.create(req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PaymentMethodResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody PaymentMethodRequest req) {
    return ResponseEntity.ok(paymentMethodUseCase.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PaymentMethodResponse> patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return ResponseEntity.ok(paymentMethodUseCase.patchStatus(id, active));
  }
}
