package com.parkflow.modules.customers.infrastructure.controller;

import com.parkflow.modules.customers.application.service.CustomerService;
import com.parkflow.modules.customers.dto.ClientListResponse;
import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.dto.ClientResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * @deprecated Use CustomerManagementUseCase and CustomerQueryUseCase ports instead.
 * This controller wraps the deprecated {@link CustomerService}.
 */
@Deprecated(since = "2.1.0", forRemoval = false)
@RestController
@RequestMapping("/api/v1/companies/{companyId}/clients")
@RequiredArgsConstructor
@Tag(name = "Clients", description = "Client management endpoints")
public class ClientController {
  private final CustomerService customerService;

  @Deprecated
  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "List clients for a company")
  public ClientListResponse list(
      @PathVariable UUID companyId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return customerService.listClients(companyId, page, size);
  }

  @Deprecated
  @GetMapping("/{clientId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get a single client")
  public ClientResponse get(@PathVariable UUID companyId, @PathVariable UUID clientId) {
    return customerService.getClient(clientId, companyId);
  }

  @Deprecated
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Create a new client")
  public ClientResponse create(
      @PathVariable UUID companyId, @Valid @RequestBody ClientRequest request) {
    return customerService.createClient(companyId, request);
  }

  @Deprecated
  @PatchMapping("/{clientId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update a client")
  public ClientResponse update(
      @PathVariable UUID companyId,
      @PathVariable UUID clientId,
      @Valid @RequestBody ClientRequest request) {
    return customerService.updateClient(clientId, companyId, request);
  }

  @Deprecated
  @DeleteMapping("/{clientId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Deactivate a client (soft delete)")
  public void delete(@PathVariable UUID companyId, @PathVariable UUID clientId) {
    customerService.deactivateClient(clientId, companyId);
  }

  @Deprecated
  @GetMapping("/count/active")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get count of active clients")
  public Long countActive(@PathVariable UUID companyId) {
    return customerService.getClientCountByCompany(companyId);
  }
}
