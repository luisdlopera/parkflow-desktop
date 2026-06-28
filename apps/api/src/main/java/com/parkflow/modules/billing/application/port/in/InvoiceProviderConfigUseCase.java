package com.parkflow.modules.billing.application.port.in;

import com.parkflow.modules.billing.dto.InvoiceProviderConfigRequest;
import com.parkflow.modules.billing.dto.InvoiceProviderConfigResponse;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import java.util.List;
import java.util.UUID;


public interface InvoiceProviderConfigUseCase {
  InvoiceProviderConfigResponse createOrUpdate(UUID companyId, InvoiceProviderConfigRequest request);
  List<InvoiceProviderConfigResponse> listForCompany(UUID companyId);
  void deactivate(UUID id, UUID companyId);
  ProviderHealthResult testConnection(UUID id, UUID companyId);
}
