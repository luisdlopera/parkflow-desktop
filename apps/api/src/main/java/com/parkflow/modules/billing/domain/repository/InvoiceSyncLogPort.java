package com.parkflow.modules.billing.domain.repository;

import com.parkflow.modules.billing.domain.InvoiceSyncLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface InvoiceSyncLogPort {
  InvoiceSyncLog save(InvoiceSyncLog log);
  Page<InvoiceSyncLog> findByCompanyId(UUID companyId, Pageable pageable);
  Page<InvoiceSyncLog> findByInvoiceId(UUID invoiceId, Pageable pageable);
}
