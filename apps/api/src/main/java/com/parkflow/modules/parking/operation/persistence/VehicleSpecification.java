package com.parkflow.modules.parking.operation.persistence;

import com.parkflow.modules.common.persistence.BaseSpecification;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;

public class VehicleSpecification extends BaseSpecification<Vehicle> {

  private String plate;
  private String ownerEmail;
  private Boolean blacklisted;
  private Boolean active;

  public VehicleSpecification withPlate(String plate) {
    this.plate = plate;
    return this;
  }

  public VehicleSpecification withOwnerEmail(String ownerEmail) {
    this.ownerEmail = ownerEmail;
    return this;
  }

  public VehicleSpecification withBlacklisted(Boolean blacklisted) {
    this.blacklisted = blacklisted;
    return this;
  }

  public VehicleSpecification withActive(Boolean active) {
    this.active = active;
    return this;
  }

  @Override
  public Predicate toPredicate(Root<Vehicle> root, jakarta.persistence.criteria.CriteriaQuery<?> query,
      CriteriaBuilder cb) {
    List<Predicate> predicates = new ArrayList<>();

    // CRITICAL: Always add tenant filter first
    addTenantFilter(root, cb, predicates);

    if (plate != null && !plate.isBlank()) {
      predicates.add(cb.like(cb.lower(root.get("plate")), "%" + plate.toLowerCase() + "%"));
    }

    if (ownerEmail != null && !ownerEmail.isBlank()) {
      predicates.add(cb.like(cb.lower(root.get("ownerEmail")), "%" + ownerEmail.toLowerCase() + "%"));
    }

    if (blacklisted != null) {
      predicates.add(cb.equal(root.get("blacklisted"), blacklisted));
    }

    if (active != null) {
      predicates.add(cb.equal(root.get("active"), active));
    }

    return buildPredicate(cb, predicates);
  }
}
