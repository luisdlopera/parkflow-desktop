package com.parkflow.modules.billing.infrastructure.controller;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.billing.application.service.InvoiceProviderConfigService;
import com.parkflow.modules.billing.dto.InvoiceProviderConfigRequest;
import com.parkflow.modules.billing.dto.InvoiceProviderConfigResponse;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/providers")
@RequiredArgsConstructor
@Tag(name = "Billing Providers", description = "Electronic invoice provider configuration per tenant")
public class InvoiceProviderConfigController {

  private final InvoiceProviderConfigService configService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "List configured invoice providers for the current tenant")
  public List<InvoiceProviderConfigResponse> list() {
    UUID companyId = TenantContext.getTenantId();
    return configService.listForCompany(companyId);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Create or update an invoice provider configuration")
  @ResponseStatus(HttpStatus.CREATED)
  public InvoiceProviderConfigResponse createOrUpdate(
      @Valid @RequestBody InvoiceProviderConfigRequest request) {
    UUID companyId = TenantContext.getTenantId();
    return configService.createOrUpdate(companyId, request);
  }

  @PostMapping("/{id}/test")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Test the connection to the configured invoice provider")
  public ProviderHealthResult testConnection(@PathVariable UUID id) {
    UUID companyId = TenantContext.getTenantId();
    return configService.testConnection(id, companyId);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Deactivate an invoice provider configuration")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deactivate(@PathVariable UUID id) {
    UUID companyId = TenantContext.getTenantId();
    configService.deactivate(id, companyId);
  }
}
