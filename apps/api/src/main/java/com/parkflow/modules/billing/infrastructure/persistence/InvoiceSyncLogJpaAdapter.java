package com.parkflow.modules.billing.infrastructure.persistence;

import com.parkflow.modules.billing.domain.InvoiceSyncLog;
import com.parkflow.modules.billing.domain.repository.InvoiceSyncLogPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class InvoiceSyncLogJpaAdapter implements InvoiceSyncLogPort {

  private final InvoiceSyncLogJpaRepository jpaRepository;

  @Override
  public InvoiceSyncLog save(InvoiceSyncLog log) {
    return jpaRepository.save(log);
  }

  @Override
  public Page<InvoiceSyncLog> findByCompanyId(UUID companyId, Pageable pageable) {
    return jpaRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, pageable);
  }

  @Override
  public Page<InvoiceSyncLog> findByInvoiceId(UUID invoiceId, Pageable pageable) {
    return jpaRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId, pageable);
  }

  @Repository
  interface InvoiceSyncLogJpaRepository extends JpaRepository<InvoiceSyncLog, UUID> {
    Page<InvoiceSyncLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);
    Page<InvoiceSyncLog> findByInvoiceIdOrderByCreatedAtDesc(UUID invoiceId, Pageable pageable);
  }
}
