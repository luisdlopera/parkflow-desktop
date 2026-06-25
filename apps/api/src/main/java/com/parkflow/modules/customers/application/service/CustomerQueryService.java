package com.parkflow.modules.customers.application.service;

import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.domain.port.ClientPort;
import com.parkflow.modules.customers.dto.ClientResponse;
import com.parkflow.modules.customers.dto.ClientListResponse;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Customer Query - handles retrieval and listing of customers.
 * Read-only service for querying customer state.
 */
@Service
@RequiredArgsConstructor
public class CustomerQueryService {
  private final ClientPort clientPort;

  @Transactional(readOnly = true)
  public ClientResponse getClient(UUID clientId, UUID companyId) {
    Client client = findClientOrThrow(clientId, companyId);
    return toResponse(client);
  }

  @Transactional(readOnly = true)
  public ClientListResponse listClients(UUID companyId, int page, int size) {
    List<Client> clients = clientPort.findByCompanyId(companyId);
    List<ClientResponse> responses =
        clients.stream().map(this::toResponse).collect(Collectors.toList());

    return new ClientListResponse(responses, (long) clients.size(), page, size);
  }

  @Transactional(readOnly = true)
  public long getClientCountByCompany(UUID companyId) {
    return clientPort.countActiveByCompanyId(companyId);
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
