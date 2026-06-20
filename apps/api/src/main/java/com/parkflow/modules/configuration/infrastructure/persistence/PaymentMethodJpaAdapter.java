package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.repository.PaymentMethodPort;
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
public class PaymentMethodJpaAdapter implements PaymentMethodPort {

  private final PaymentMethodJpaRepository jpaRepository;

  @Override
  public Optional<PaymentMethod> findByCode(String code) {
    return jpaRepository.findByCodeAndCompanyIdIsNull(code);
  }

  @Override
  public boolean existsByCode(String code) {
    return jpaRepository.existsByCodeAndCompanyIdIsNull(code);
  }

  @Override
  public Optional<PaymentMethod> findByCodeAndCompany(String code, UUID companyId) {
    return jpaRepository.findByCodeAndCompanyId(code, companyId);
  }

  @Override
  public boolean existsByCodeAndCompany(String code, UUID companyId) {
    return jpaRepository.existsByCodeAndCompanyId(code, companyId);
  }

  @Override
  public Page<PaymentMethod> search(String q, Boolean active, UUID companyId, Pageable pageable) {
    return jpaRepository.searchByCompany(q, active, companyId, pageable);
  }

  @Override
  public PaymentMethod save(PaymentMethod paymentMethod) {
    return jpaRepository.save(paymentMethod);
  }

  @Override
  public Optional<PaymentMethod> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface PaymentMethodJpaRepository extends JpaRepository<PaymentMethod, UUID> {
    Optional<PaymentMethod> findByCodeAndCompanyIdIsNull(String code);

    boolean existsByCodeAndCompanyIdIsNull(String code);

    Optional<PaymentMethod> findByCodeAndCompanyId(String code, UUID companyId);

    boolean existsByCodeAndCompanyId(String code, UUID companyId);

    @Query("SELECT p FROM PaymentMethod p WHERE p.companyId = :companyId AND (:q IS NULL OR :q = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR p.isActive = :active)")
    Page<PaymentMethod> searchByCompany(
        @Param("q") String q,
        @Param("active") Boolean active,
        @Param("companyId") UUID companyId,
        Pageable pageable);
  }
}
