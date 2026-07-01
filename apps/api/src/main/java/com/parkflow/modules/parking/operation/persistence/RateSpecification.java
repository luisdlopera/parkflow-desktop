package com.parkflow.modules.parking.operation.persistence;

import com.parkflow.modules.common.persistence.BaseSpecification;
import com.parkflow.modules.parking.operation.domain.Rate;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specification for Rate queries with tenant filtering.
 *
 * Usage:
 * <pre>
 * RateSpecification spec = new RateSpecification()
 *   .withActive(true)
 *   .withType(RateType.HOURLY);
 *
 * List<Rate> rates = rateRepository.findAll(spec);
 * // Auto-filters by tenant + active=true + type=HOURLY
 * </pre>
 */
public class RateSpecification extends BaseSpecification<Rate> {

  private Boolean active;
  private String type;
  private String name;

  public RateSpecification withActive(Boolean active) {
    this.active = active;
    return this;
  }

  public RateSpecification withType(String type) {
    this.type = type;
    return this;
  }

  public RateSpecification withName(String name) {
    this.name = name;
    return this;
  }

  @Override
  public Predicate toPredicate(Root<Rate> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
    List<Predicate> predicates = new ArrayList<>();

    // CRITICAL: Always add tenant filter first
    addTenantFilter(root, cb, predicates);

    // Add custom filters
    if (active != null) {
      predicates.add(cb.equal(root.get("active"), active));
    }

    if (type != null) {
      predicates.add(cb.equal(root.get("type"), type));
    }

    if (name != null) {
      predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
    }

    return buildPredicate(cb, predicates);
  }
}
