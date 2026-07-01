package com.parkflow.modules.auth.persistence;

import com.parkflow.modules.common.persistence.BaseSpecification;
import com.parkflow.modules.auth.domain.AppUser;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;

public class AppUserSpecification extends BaseSpecification<AppUser> {

  private String email;
  private String role;
  private Boolean active;
  private Boolean blocked;

  public AppUserSpecification withEmail(String email) {
    this.email = email;
    return this;
  }

  public AppUserSpecification withRole(String role) {
    this.role = role;
    return this;
  }

  public AppUserSpecification withActive(Boolean active) {
    this.active = active;
    return this;
  }

  public AppUserSpecification withBlocked(Boolean blocked) {
    this.blocked = blocked;
    return this;
  }

  @Override
  public Predicate toPredicate(Root<AppUser> root, jakarta.persistence.criteria.CriteriaQuery<?> query,
      CriteriaBuilder cb) {
    List<Predicate> predicates = new ArrayList<>();

    // CRITICAL: Always add tenant filter first
    addTenantFilter(root, cb, predicates);

    if (email != null && !email.isBlank()) {
      predicates.add(cb.like(cb.lower(root.get("email")), "%" + email.toLowerCase() + "%"));
    }

    if (role != null && !role.isBlank()) {
      predicates.add(cb.equal(root.get("role"), role));
    }

    if (active != null) {
      predicates.add(cb.equal(root.get("active"), active));
    }

    if (blocked != null) {
      predicates.add(cb.equal(root.get("blocked"), blocked));
    }

    return buildPredicate(cb, predicates);
  }
}
