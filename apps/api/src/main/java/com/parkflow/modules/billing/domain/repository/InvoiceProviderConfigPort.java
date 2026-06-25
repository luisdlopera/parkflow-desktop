package com.parkflow.modules.billing.domain.repository;

import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceProviderConfigPort {
  InvoiceProviderConfig save(InvoiceProviderConfig config);
  Optional<InvoiceProviderConfig> findById(UUID id);
  List<InvoiceProviderConfig> findByCompanyId(UUID companyId);
  Optional<InvoiceProviderConfig> findDefaultForCompany(UUID companyId);
  Optional<InvoiceProviderConfig> findByCompanyIdAndProviderType(UUID companyId, InvoiceProviderType type);
  void deleteById(UUID id);
}
