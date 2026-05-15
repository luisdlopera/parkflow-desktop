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
    return jpaRepository.findByCode(code);
  }

  @Override
  public boolean existsByCode(String code) {
    return jpaRepository.existsByCode(code);
  }

  @Override
  public Page<PaymentMethod> search(String q, Boolean active, Pageable pageable) {
    return jpaRepository.search(q, active, pageable);
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
    Optional<PaymentMethod> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT p FROM PaymentMethod p WHERE (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR p.isActive = :active)")
    Page<PaymentMethod> search(
        @Param("q") String q,
        @Param("active") Boolean active,
        Pageable pageable);
  }
}
