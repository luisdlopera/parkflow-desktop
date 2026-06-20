package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface PaymentMethodPort {
  // Global catalogue (company_id = NULL) — used by materializePaymentMethods
  Optional<PaymentMethod> findByCode(String code);
  boolean existsByCode(String code);

  // Per-company operations
  Optional<PaymentMethod> findByCodeAndCompany(String code, UUID companyId);
  boolean existsByCodeAndCompany(String code, UUID companyId);
  Page<PaymentMethod> search(String q, Boolean active, UUID companyId, Pageable pageable);

  PaymentMethod save(PaymentMethod paymentMethod);
  Optional<PaymentMethod> findById(UUID id);
}
