package com.parkflow.modules.billing.infrastructure.persistence;

import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.domain.repository.InvoiceProviderConfigPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class InvoiceProviderConfigJpaAdapter implements InvoiceProviderConfigPort {

  private final InvoiceProviderConfigJpaRepository jpaRepository;

  @Override
  public InvoiceProviderConfig save(InvoiceProviderConfig config) {
    return jpaRepository.save(config);
  }

  @Override
  public Optional<InvoiceProviderConfig> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public List<InvoiceProviderConfig> findByCompanyId(UUID companyId) {
    return jpaRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
  }

  @Override
  public Optional<InvoiceProviderConfig> findDefaultForCompany(UUID companyId) {
    return jpaRepository.findByCompanyIdAndIsDefaultTrueAndIsActiveTrue(companyId);
  }

  @Override
  public Optional<InvoiceProviderConfig> findByCompanyIdAndProviderType(UUID companyId, InvoiceProviderType type) {
    return jpaRepository.findByCompanyIdAndProviderType(companyId, type);
  }

  @Override
  public void deleteById(UUID id) {
    jpaRepository.deleteById(id);
  }

  @Repository
  interface InvoiceProviderConfigJpaRepository extends JpaRepository<InvoiceProviderConfig, UUID> {
    List<InvoiceProviderConfig> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
    Optional<InvoiceProviderConfig> findByCompanyIdAndIsDefaultTrueAndIsActiveTrue(UUID companyId);
    Optional<InvoiceProviderConfig> findByCompanyIdAndProviderType(UUID companyId, InvoiceProviderType type);
  }
}
