package com.parkflow.modules.billing.persistence;

import com.parkflow.modules.common.persistence.BaseSpecification;
import com.parkflow.modules.parking.operation.domain.Payment;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class PaymentSpecification extends BaseSpecification<Payment> {

  private String status;
  private String method;
  private LocalDateTime createdAfter;
  private LocalDateTime createdBefore;

  public PaymentSpecification withStatus(String status) {
    this.status = status;
    return this;
  }

  public PaymentSpecification withMethod(String method) {
    this.method = method;
    return this;
  }

  public PaymentSpecification withCreatedAfter(LocalDateTime createdAfter) {
    this.createdAfter = createdAfter;
    return this;
  }

  public PaymentSpecification withCreatedBefore(LocalDateTime createdBefore) {
    this.createdBefore = createdBefore;
    return this;
  }

  @Override
  public Predicate toPredicate(Root<Payment> root, jakarta.persistence.criteria.CriteriaQuery<?> query,
      CriteriaBuilder cb) {
    List<Predicate> predicates = new ArrayList<>();

    // CRITICAL: Always add tenant filter first
    addTenantFilter(root, cb, predicates);

    if (status != null && !status.isBlank()) {
      predicates.add(cb.equal(root.get("status"), status));
    }

    if (method != null && !method.isBlank()) {
      predicates.add(cb.equal(root.get("paymentMethod"), method));
    }

    if (createdAfter != null) {
      predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), createdAfter));
    }

    if (createdBefore != null) {
      predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), createdBefore));
    }

    return buildPredicate(cb, predicates);
  }
}
