package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.Payment;
import java.util.Optional;
import java.util.UUID;

public interface PaymentPort {
  Payment save(Payment payment);
  Optional<Payment> findById(UUID id);
  void delete(Payment payment);
}
