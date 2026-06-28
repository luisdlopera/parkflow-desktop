package com.parkflow.modules.customers.application.port.in;

import com.parkflow.modules.customers.dto.ClientResponse;
import com.parkflow.modules.customers.dto.ClientListResponse;
import java.util.UUID;


public interface CustomerQueryUseCase {
  ClientResponse getClient(UUID clientId, UUID companyId);
  ClientListResponse listClients(UUID companyId, int page, int size);
  long getClientCountByCompany(UUID companyId);
}
