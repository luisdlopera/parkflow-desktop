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
import com.parkflow.modules.parking.operation.repository.CustodiedItemRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LockerService {

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

    if (custodiedItemRepository.existsByLockerIdAndStatus(id, CustodiedItemStatus.RECEIVED)) {
      throw new OperationException(HttpStatus.CONFLICT, "LOCKER_OCCUPIED",
          "No se puede eliminar un locker que está en uso. Desactívalo en su lugar.");
    }

    lockerPort.delete(locker);
  }

  private LockerResponse toResponse(Locker locker) {
    boolean occupied = custodiedItemRepository.existsByLockerIdAndStatus(locker.getId(), CustodiedItemStatus.RECEIVED);
    return new LockerResponse(locker.getId(), locker.getCode(), locker.getLabel(),
        locker.getStatus(), Boolean.TRUE.equals(locker.getIsActive()), occupied);
  }
}
