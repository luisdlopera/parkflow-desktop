package com.parkflow.modules.customers.application.port.in;

import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.domain.port.ClientPort;
import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.dto.ClientResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface CustomerManagementUseCase {
  ClientResponse createClient(UUID companyId, ClientRequest request);
  ClientResponse updateClient(UUID clientId, UUID companyId, ClientRequest request);
  void deactivateClient(UUID clientId, UUID companyId);
}
