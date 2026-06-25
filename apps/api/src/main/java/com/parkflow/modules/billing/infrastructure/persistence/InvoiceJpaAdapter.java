package com.parkflow.modules.billing.infrastructure.persistence;

import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.domain.repository.InvoicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class InvoiceJpaAdapter implements InvoicePort {

  private final InvoiceJpaRepository jpaRepository;

  @Override
  public Invoice save(Invoice invoice) {
    return jpaRepository.save(invoice);
  }

  @Override
  public Optional<Invoice> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public Optional<Invoice> findByIdAndCompanyId(UUID id, UUID companyId) {
    return jpaRepository.findByIdAndCompanyId(id, companyId);
  }

  @Override
  public Optional<Invoice> findByExternalId(String externalId) {
    return jpaRepository.findByExternalId(externalId);
  }

  @Override
  public Page<Invoice> search(UUID companyId, InvoiceStatus status, String clientName, Pageable pageable) {
    return jpaRepository.search(companyId, status, pageable);
  }

  @Override
  public boolean existsByNumber(String number, UUID companyId) {
    return jpaRepository.existsByNumberAndCompanyId(number, companyId);
  }

  @Override
  public long countByCompanyIdAndStatus(UUID companyId, InvoiceStatus status) {
    return jpaRepository.countByCompanyIdAndStatus(companyId, status);
  }

  @Repository
  interface InvoiceJpaRepository extends JpaRepository<Invoice, UUID> {
    Optional<Invoice> findByIdAndCompanyId(UUID id, UUID companyId);

    Optional<Invoice> findByExternalId(String externalId);

    boolean existsByNumberAndCompanyId(String number, UUID companyId);

    long countByCompanyIdAndStatus(UUID companyId, InvoiceStatus status);

    @Query("SELECT i FROM Invoice i WHERE i.companyId = :companyId AND (:status IS NULL OR i.status = :status) ORDER BY i.createdAt DESC")
    Page<Invoice> search(@Param("companyId") UUID companyId, @Param("status") InvoiceStatus status, Pageable pageable);
  }
}
