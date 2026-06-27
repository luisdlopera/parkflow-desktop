package com.parkflow.modules.customers.application.port.in;

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

public interface CustomerQueryUseCase {
  ClientResponse getClient(UUID clientId, UUID companyId);
  ClientListResponse listClients(UUID companyId, int page, int size);
  long getClientCountByCompany(UUID companyId);
}
