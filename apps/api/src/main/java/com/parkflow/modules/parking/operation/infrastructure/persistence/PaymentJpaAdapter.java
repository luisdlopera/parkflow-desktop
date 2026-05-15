package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.Payment;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PaymentJpaAdapter implements PaymentPort {

  private final PaymentJpaRepository jpaRepository;

  @Override
  public Payment save(Payment payment) {
    return jpaRepository.save(payment);
  }

  @Override
  public Optional<Payment> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public void delete(Payment payment) {
    jpaRepository.delete(payment);
  }

  @Repository
  interface PaymentJpaRepository extends JpaRepository<Payment, UUID> {
  }
}
