package com.parkflow.modules.customers.application.port.in;

import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.dto.ClientResponse;
import java.util.UUID;


public interface CustomerManagementUseCase {
  ClientResponse createClient(UUID companyId, ClientRequest request);
  ClientResponse updateClient(UUID clientId, UUID companyId, ClientRequest request);
  void deactivateClient(UUID clientId, UUID companyId);
}
