package com.parkflow.modules.licensing.controller;

import com.parkflow.modules.licensing.application.service.SubscriptionService;
import com.parkflow.modules.licensing.dto.CreateSubscriptionRequest;
import com.parkflow.modules.licensing.dto.SubscriptionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/companies/{companyId}/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscriptions", description = "Gestión del ciclo de vida de suscripciones SaaS por empresa")
public class SubscriptionController {

  private final SubscriptionService subscriptionService;

  @GetMapping
  @PreAuthorize("hasAnyAuthority('admin:read', 'SUPER_ADMIN')")
  @Operation(summary = "Listar historial de suscripciones de una empresa")
  public List<SubscriptionResponse> list(@PathVariable UUID companyId) {
    return subscriptionService.listByCompany(companyId);
  }

  @GetMapping("/active")
  @PreAuthorize("hasAnyAuthority('admin:read', 'SUPER_ADMIN')")
  @Operation(summary = "Obtener la suscripción activa de una empresa")
  public SubscriptionResponse getActive(@PathVariable UUID companyId) {
    return subscriptionService.getActive(companyId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('SUPER_ADMIN')")
  @Operation(summary = "Crear o cambiar la suscripción de una empresa (cancela la activa si existe)")
  public SubscriptionResponse create(
      @PathVariable UUID companyId,
      @Valid @RequestBody CreateSubscriptionRequest request) {
    return subscriptionService.create(companyId, request);
  }

  @PatchMapping("/{subscriptionId}/cancel")
  @PreAuthorize("hasAuthority('SUPER_ADMIN')")
  @Operation(summary = "Cancelar una suscripción")
  public SubscriptionResponse cancel(
      @PathVariable UUID companyId,
      @PathVariable UUID subscriptionId) {
    return subscriptionService.cancel(companyId, subscriptionId);
  }

  @PatchMapping("/{subscriptionId}/suspend")
  @PreAuthorize("hasAuthority('SUPER_ADMIN')")
  @Operation(summary = "Suspender una suscripción")
  public SubscriptionResponse suspend(
      @PathVariable UUID companyId,
      @PathVariable UUID subscriptionId) {
    return subscriptionService.suspend(companyId, subscriptionId);
  }
}
