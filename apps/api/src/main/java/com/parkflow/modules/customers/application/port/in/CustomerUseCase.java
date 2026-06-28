package com.parkflow.modules.customers.application.port.in;

import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.dto.ClientResponse;
import com.parkflow.modules.customers.dto.ClientListResponse;
import java.util.UUID;


public interface CustomerUseCase {
  ClientResponse createClient(UUID companyId, ClientRequest request);
  ClientResponse getClient(UUID clientId, UUID companyId);
  ClientListResponse listClients(UUID companyId, int page, int size);
  ClientResponse updateClient(UUID clientId, UUID companyId, ClientRequest request);
  void deactivateClient(UUID clientId, UUID companyId);
  long getClientCountByCompany(UUID companyId);
}
