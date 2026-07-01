package com.parkflow.modules.common.persistence;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;

/**
 * Base specification for all multi-tenant queries.
 *
 * Automatically adds a WHERE clause: company_id = current_tenant
 * Uses TenantContext (set by JwtAuthFilter) for thread-safe tenant extraction.
 *
 * Usage:
 * <pre>
 * public class RateSpecification extends BaseSpecification<Rate> {
 *   public Predicate toPredicate(Root<Rate> root, ...) {
 *     List<Predicate> predicates = new ArrayList<>();
 *     addTenantFilter(root, cb, predicates);  // Auto-filter by tenant
 *
 *     // Add custom filters
 *     if (active != null && active) {
 *       predicates.add(cb.equal(root.get("active"), true));
 *     }
 *
 *     return cb.and(predicates.toArray(new Predicate[0]));
 *   }
 * }
 *
 * // In service:
 * RateSpecification spec = new RateSpecification().withActive(true);
 * List<Rate> rates = rateRepository.findAll(spec);  // Tenant auto-filtered
 * </pre>
 *
 * CRITICAL: Tenant context must be set by JwtAuthFilter before request reaches repository.
 * If tenant context is missing, this throws OperationException (fail-safe).
 *
 * @param <T> Entity type
 */
public abstract class BaseSpecification<T> implements Specification<T> {

  /**
   * Adds a WHERE clause filtering by company_id = current tenant.
   *
   * Extracted from TenantContext (set by JwtAuthFilter).
   * This ensures all queries automatically respect tenant isolation.
   * Throws OperationException if tenant not in context (fail-safe).
   *
   * @param root JPA Root<T>
   * @param cb CriteriaBuilder
   * @param predicates List to append the tenant filter to
   * @throws OperationException if tenant context missing
   */
  protected void addTenantFilter(Root<T> root, CriteriaBuilder cb, List<Predicate> predicates) {
    UUID tenantId = TenantContext.getTenantIdOrThrow();  // Throws if null
    predicates.add(cb.equal(root.get("companyId"), tenantId));
  }

  /**
   * For optional contexts (e.g., anonymous requests that don't need filtering).
   * Returns null predicate if tenant not set.
   */
  protected Predicate optionalTenantFilter(Root<T> root, CriteriaBuilder cb) {
    UUID tenantId = TenantContext.getTenantId();
    if (tenantId == null) {
      return null;  // No filter applied (use for public data)
    }
    return cb.equal(root.get("companyId"), tenantId);
  }

  /**
   * Helper: build AND predicate from list.
   */
  protected Predicate buildPredicate(CriteriaBuilder cb, List<Predicate> predicates) {
    if (predicates.isEmpty()) {
      return cb.conjunction();  // Always true
    }
    return cb.and(predicates.toArray(new Predicate[0]));
  }
}
