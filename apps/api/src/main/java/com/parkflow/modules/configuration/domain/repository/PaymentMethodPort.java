package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface PaymentMethodPort {
  Optional<PaymentMethod> findByCode(String code);
  boolean existsByCode(String code);
  Page<PaymentMethod> search(String q, Boolean active, Pageable pageable);
  PaymentMethod save(PaymentMethod paymentMethod);
  Optional<PaymentMethod> findById(UUID id);
}
