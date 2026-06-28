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
import org.springframework.http.ResponseEntity;
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
  public ResponseEntity<ClientListResponse> list(
      @PathVariable UUID companyId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    ClientListResponse response = customerService.listClients(companyId, page, size);
    return ResponseEntity.ok(response);
  }

  @Deprecated
  @GetMapping("/{clientId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get a single client")
  public ResponseEntity<ClientResponse> get(@PathVariable UUID companyId, @PathVariable UUID clientId) {
    ClientResponse response = customerService.getClient(clientId, companyId);
    return ResponseEntity.ok(response);
  }

  @Deprecated
  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Create a new client")
  public ResponseEntity<ClientResponse> create(
      @PathVariable UUID companyId, @Valid @RequestBody ClientRequest request) {
    ClientResponse response = customerService.createClient(companyId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @Deprecated
  @PatchMapping("/{clientId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update a client")
  public ResponseEntity<ClientResponse> update(
      @PathVariable UUID companyId,
      @PathVariable UUID clientId,
      @Valid @RequestBody ClientRequest request) {
    ClientResponse response = customerService.updateClient(clientId, companyId, request);
    return ResponseEntity.ok(response);
  }

  @Deprecated
  @DeleteMapping("/{clientId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Deactivate a client (soft delete)")
  public ResponseEntity<Void> delete(@PathVariable UUID companyId, @PathVariable UUID clientId) {
    customerService.deactivateClient(clientId, companyId);
    return ResponseEntity.noContent().build();
  }

  @Deprecated
  @GetMapping("/count/active")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get count of active clients")
  public ResponseEntity<Long> countActive(@PathVariable UUID companyId) {
    long count = customerService.getClientCountByCompany(companyId);
    return ResponseEntity.ok(count);
  }
}
