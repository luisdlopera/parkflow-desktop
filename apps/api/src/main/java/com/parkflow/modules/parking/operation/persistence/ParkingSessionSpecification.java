package com.parkflow.modules.parking.operation.persistence;

import com.parkflow.modules.common.persistence.BaseSpecification;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ParkingSessionSpecification extends BaseSpecification<ParkingSession> {

  private Boolean active;
  private String vehicleId;
  private LocalDateTime startDateAfter;
  private LocalDateTime endDateBefore;

  public ParkingSessionSpecification withActive(Boolean active) {
    this.active = active;
    return this;
  }

  public ParkingSessionSpecification withVehicleId(String vehicleId) {
    this.vehicleId = vehicleId;
    return this;
  }

  public ParkingSessionSpecification withStartDateAfter(LocalDateTime startDateAfter) {
    this.startDateAfter = startDateAfter;
    return this;
  }

  public ParkingSessionSpecification withEndDateBefore(LocalDateTime endDateBefore) {
    this.endDateBefore = endDateBefore;
    return this;
  }

  @Override
  public Predicate toPredicate(Root<ParkingSession> root, jakarta.persistence.criteria.CriteriaQuery<?> query,
      CriteriaBuilder cb) {
    List<Predicate> predicates = new ArrayList<>();

    // CRITICAL: Always add tenant filter first
    addTenantFilter(root, cb, predicates);

    if (active != null) {
      predicates.add(cb.equal(root.get("active"), active));
    }

    if (vehicleId != null && !vehicleId.isBlank()) {
      predicates.add(cb.equal(root.get("vehicleId"), vehicleId));
    }

    if (startDateAfter != null) {
      predicates.add(cb.greaterThanOrEqualTo(root.get("startTime"), startDateAfter));
    }

    if (endDateBefore != null) {
      predicates.add(cb.lessThanOrEqualTo(root.get("endTime"), endDateBefore));
    }

    return buildPredicate(cb, predicates);
  }
}
