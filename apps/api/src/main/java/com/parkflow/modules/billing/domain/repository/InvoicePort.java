package com.parkflow.modules.billing.domain.repository;

import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface InvoicePort {
  Invoice save(Invoice invoice);
  Optional<Invoice> findById(UUID id);
  Optional<Invoice> findByIdAndCompanyId(UUID id, UUID companyId);
  Optional<Invoice> findByExternalId(String externalId);
  Page<Invoice> search(UUID companyId, InvoiceStatus status, String clientName, Pageable pageable);
  boolean existsByNumber(String number, UUID companyId);
  long countByCompanyIdAndStatus(UUID companyId, InvoiceStatus status);
}
