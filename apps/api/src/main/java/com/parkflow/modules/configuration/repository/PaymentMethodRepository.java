package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.PaymentMethod;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, UUID> {

  Optional<PaymentMethod> findByCode(String code);

  boolean existsByCode(String code);

  @Query("SELECT p FROM PaymentMethod p WHERE (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR p.isActive = :active)")
  Page<PaymentMethod> search(
      @Param("q") String q,
      @Param("active") Boolean active,
      Pageable pageable);
}
