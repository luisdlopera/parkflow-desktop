package com.parkflow.modules.parking.locker.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.locker.dto.LockerResponse;
import com.parkflow.modules.parking.locker.dto.PatchLockerRequest;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.locker.application.port.in.LockerManagementUseCase;
import com.parkflow.modules.parking.locker.application.port.out.LockerRepositoryPort;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Locker Management - handles creation, updates, and deletion of lockers.
 * Manages locker lifecycle and status.
 */
@Service
@RequiredArgsConstructor
public class LockerManagementService implements LockerManagementUseCase {

  private final LockerRepositoryPort lockerPort;
  private final CustodiedItemPort custodiedItemRepository;

  @Transactional
  public LockerResponse createLocker(String code, String label) {
    UUID companyId = SecurityUtils.requireCompanyId();
    if (lockerPort.existsByCompanyIdAndCode(companyId, code.trim())) {
      throw new OperationException(HttpStatus.CONFLICT, "CODE_DUPLICATED",
          "Ya existe un locker con el código: " + code);
    }
    Locker locker = Locker.builder()
        .companyId(companyId)
        .code(code.trim())
        .label(label != null ? label.trim() : null)
        .status(LockerStatus.DISPONIBLE)
        .isActive(true)
        .build();
    return toResponse(lockerPort.save(locker));
  }

  @Transactional
  public List<LockerResponse> createBatch(UUID companyId, BatchLockerRequest request) {
    String prefix = request.prefix() != null ? request.prefix().trim() : "L-";
    List<LockerResponse> results = new ArrayList<>();

    for (int i = request.start(); i <= request.end(); i++) {
      String code = prefix + String.format("%02d", i);
      if (lockerPort.existsByCompanyIdAndCode(companyId, code)) {
        continue;
      }
      Locker locker = Locker.builder()
          .companyId(companyId)
          .code(code)
          .label("Locker " + code)
          .status(LockerStatus.DISPONIBLE)
          .isActive(true)
          .build();
      results.add(toResponse(lockerPort.save(locker)));
    }
    return results;
  }

  @Transactional
  public LockerResponse patchLocker(UUID id, PatchLockerRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    Locker locker = lockerPort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "LOCKER_NOT_FOUND",
            "Locker no encontrado"));

    if (request.code() != null) {
      String newCode = request.code().trim();
      if (!newCode.equals(locker.getCode()) && lockerPort.existsByCompanyIdAndCode(companyId, newCode)) {
        throw new OperationException(HttpStatus.CONFLICT, "CODE_DUPLICATED",
            "Ya existe otro locker con el código: " + newCode);
      }
      locker.setCode(newCode);
    }
    if (request.label() != null) {
      locker.setLabel(request.label().isBlank() ? null : request.label().trim());
    }
    if (request.isActive() != null) {
      locker.setIsActive(request.isActive());
    }
    if (request.status() != null) {
      locker.setStatus(request.status());
    }

    return toResponse(lockerPort.save(locker));
  }

  @Transactional
  public void deleteLocker(UUID id) {
    UUID companyId = SecurityUtils.requireCompanyId();
    Locker locker = lockerPort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "LOCKER_NOT_FOUND",
            "Locker no encontrado"));

    if (custodiedItemRepository.existsActiveByLockerId(id)) {
      throw new OperationException(HttpStatus.CONFLICT, "LOCKER_OCCUPIED",
          "No se puede eliminar un locker que está en uso. Desactívalo en su lugar.");
    }

    lockerPort.delete(locker);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private LockerResponse toResponse(Locker locker) {
    boolean occupied = custodiedItemRepository.existsActiveByLockerId(locker.getId());
    return new LockerResponse(locker.getId(), locker.getCode(), locker.getLabel(),
        locker.getStatus(), Boolean.TRUE.equals(locker.getIsActive()), occupied);
  }
}
