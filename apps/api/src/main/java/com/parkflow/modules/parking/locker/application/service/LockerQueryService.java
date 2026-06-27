package com.parkflow.modules.parking.locker.application.service;

import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.application.port.out.LockerPort;
import com.parkflow.modules.parking.locker.dto.LockerResponse;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.infrastructure.persistence.CustodiedItemRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Locker Query - handles retrieval and listing of lockers.
 * Read-only service for querying locker state and availability.
 */
@Service
@RequiredArgsConstructor
public class LockerQueryService {

  private final LockerPort lockerPort;
  private final CustodiedItemRepository custodiedItemRepository;

  @Transactional(readOnly = true)
  public List<LockerResponse> listLockers(UUID companyId) {
    return lockerPort.findByCompanyId(companyId).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<LockerResponse> listAvailableLockers(UUID companyId) {
    List<Locker> all = lockerPort.findActiveByCompanyId(companyId);
    return all.stream()
        .filter(l -> l.getStatus() == LockerStatus.DISPONIBLE)
        .filter(l -> !custodiedItemRepository.existsByLockerIdAndStatus(l.getId(), CustodiedItemStatus.RECEIVED))
        .map(this::toResponse)
        .toList();
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private LockerResponse toResponse(Locker locker) {
    boolean occupied = custodiedItemRepository.existsByLockerIdAndStatus(locker.getId(), CustodiedItemStatus.RECEIVED);
    return new LockerResponse(locker.getId(), locker.getCode(), locker.getLabel(),
        locker.getStatus(), Boolean.TRUE.equals(locker.getIsActive()), occupied);
  }
}
