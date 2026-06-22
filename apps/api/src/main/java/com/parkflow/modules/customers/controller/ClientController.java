package com.parkflow.modules.customers.controller;

import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.dto.ClientResponse;
import com.parkflow.modules.customers.repository.ClientRepository;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/companies/{companyId}/clients")
@RequiredArgsConstructor
public class ClientController {

  private final ClientRepository clientRepository;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<ClientResponse>> list(
      @PathVariable UUID companyId,
      @RequestParam(required = false) String search,
      Pageable pageable) {
    Page<Client> page = clientRepository.search(companyId, search, pageable);
    return ResponseEntity.ok(SettingsPageResponse.of(page.map(this::toResponse)));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ClientResponse> create(
      @PathVariable UUID companyId,
      @Valid @RequestBody ClientRequest req) {
    Client client = new Client();
    client.setCompanyId(companyId);
    client.setName(req.name().trim());
    client.setDocument(req.document());
    client.setPhone(req.phone());
    client.setEmail(req.email());
    client = clientRepository.save(client);
    return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(client));
  }

  private ClientResponse toResponse(Client client) {
      return new ClientResponse(
          client.getId(),
          client.getCompanyId(),
          client.getName(),
          client.getDocument(),
          client.getPhone(),
          client.getEmail(),
          client.isActive(),
          client.getCreatedAt(),
          client.getUpdatedAt()
      );
  }
}
