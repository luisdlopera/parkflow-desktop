package com.parkflow.modules.customers.application.port.in;

import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.domain.port.ClientPort;
import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.dto.ClientResponse;
import com.parkflow.modules.customers.dto.ClientListResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface CustomerUseCase {
  ClientResponse createClient(UUID companyId, ClientRequest request);
  ClientResponse getClient(UUID clientId, UUID companyId);
  ClientListResponse listClients(UUID companyId, int page, int size);
  ClientResponse updateClient(UUID clientId, UUID companyId, ClientRequest request);
  void deactivateClient(UUID clientId, UUID companyId);
  long getClientCountByCompany(UUID companyId);
}
