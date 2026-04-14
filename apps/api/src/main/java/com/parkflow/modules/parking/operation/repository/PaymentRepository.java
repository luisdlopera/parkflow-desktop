package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.Payment;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
}
