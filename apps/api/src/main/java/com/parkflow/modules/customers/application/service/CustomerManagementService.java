package com.parkflow.modules.customers.application.service;

import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.domain.port.ClientPort;
import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.dto.ClientResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Customer Management - handles creation, updates, and deactivation of customers.
 * Manages customer lifecycle and account operations.
 */
@Service
@RequiredArgsConstructor
public class CustomerManagementService {
  private final ClientPort clientPort;

  @Transactional
  public ClientResponse createClient(UUID companyId, ClientRequest request) {
    if (clientPort.findByDocumentAndCompanyId(request.document(), companyId).isPresent()) {
      throw new IllegalArgumentException(
          "Client with document " + request.document() + " already exists");
    }

    Client client = new Client();
    client.setCompanyId(companyId);
    client.setName(request.name());
    client.setDocument(request.document());
    client.setEmail(request.email());
    client.setPhone(request.phone());
    client.setActive(true);
    client.setCreatedAt(OffsetDateTime.now());
    client.setUpdatedAt(OffsetDateTime.now());

    Client saved = clientPort.save(client);
    return toResponse(saved);
  }

  @Transactional
  public ClientResponse updateClient(UUID clientId, UUID companyId, ClientRequest request) {
    Client client = findClientOrThrow(clientId, companyId);

    if (request.name() != null) {
      client.setName(request.name());
    }
    if (request.email() != null) {
      client.setEmail(request.email());
    }
    if (request.phone() != null) {
      client.setPhone(request.phone());
    }

    client.setUpdatedAt(OffsetDateTime.now());
    Client updated = clientPort.save(client);
    return toResponse(updated);
  }

  @Transactional
  public void deactivateClient(UUID clientId, UUID companyId) {
    Client client = findClientOrThrow(clientId, companyId);
    client.setActive(false);
    client.setUpdatedAt(OffsetDateTime.now());
    clientPort.save(client);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private Client findClientOrThrow(UUID clientId, UUID companyId) {
    return clientPort
        .findById(clientId)
        .filter(c -> c.getCompanyId().equals(companyId))
        .orElseThrow(
            () ->
                new IllegalArgumentException(
                    "Client not found with ID " + clientId + " in company " + companyId));
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
