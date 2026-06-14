package com.parkflow.modules.parking.helmet.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.helmet.domain.HelmetLocker;
import com.parkflow.modules.parking.helmet.domain.repository.HelmetLockerPort;
import com.parkflow.modules.parking.helmet.dto.BatchHelmetLockerRequest;
import com.parkflow.modules.parking.helmet.dto.HelmetLockerResponse;
import com.parkflow.modules.parking.helmet.dto.PatchHelmetLockerRequest;
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
public class HelmetLockerService {

  private final HelmetLockerPort helmetLockerPort;
  private final CustodiedItemRepository custodiedItemRepository;

  @Transactional(readOnly = true)
  public List<HelmetLockerResponse> listLockers(UUID companyId) {
    return helmetLockerPort.findByCompanyId(companyId).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<HelmetLockerResponse> listAvailableLockers(UUID companyId) {
    List<HelmetLocker> all = helmetLockerPort.findActiveByCompanyId(companyId);
    return all.stream()
        .filter(l -> !custodiedItemRepository.existsByLockerIdAndStatus(l.getId(), CustodiedItemStatus.RECEIVED))
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public HelmetLockerResponse createLocker(String code, String label) {
    UUID companyId = SecurityUtils.requireCompanyId();
    if (helmetLockerPort.existsByCompanyIdAndCode(companyId, code.trim())) {
      throw new OperationException(HttpStatus.CONFLICT, "CODE_DUPLICATED",
          "Ya existe una ficha con el código: " + code);
    }
    HelmetLocker locker = HelmetLocker.builder()
        .companyId(companyId)
        .code(code.trim())
        .label(label != null ? label.trim() : null)
        .isActive(true)
        .build();
    return toResponse(helmetLockerPort.save(locker));
  }

  @Transactional
  public List<HelmetLockerResponse> createBatch(BatchHelmetLockerRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    String prefix = request.prefix() != null ? request.prefix().trim() : "";
    List<HelmetLockerResponse> results = new ArrayList<>();

    for (int i = request.start(); i <= request.end(); i++) {
      String code = prefix + String.format("%02d", i);
      if (helmetLockerPort.existsByCompanyIdAndCode(companyId, code)) {
        continue;
      }
      HelmetLocker locker = HelmetLocker.builder()
          .companyId(companyId)
          .code(code)
          .label("Casillero " + code)
          .isActive(true)
          .build();
      results.add(toResponse(helmetLockerPort.save(locker)));
    }
    return results;
  }

  @Transactional
  public HelmetLockerResponse patchLocker(UUID id, PatchHelmetLockerRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    HelmetLocker locker = helmetLockerPort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "LOCKER_NOT_FOUND",
            "Ficha no encontrada"));

    if (request.code() != null) {
      String newCode = request.code().trim();
      if (!newCode.equals(locker.getCode()) && helmetLockerPort.existsByCompanyIdAndCode(companyId, newCode)) {
        throw new OperationException(HttpStatus.CONFLICT, "CODE_DUPLICATED",
            "Ya existe otra ficha con el código: " + newCode);
      }
      locker.setCode(newCode);
    }
    if (request.label() != null) {
      locker.setLabel(request.label().isBlank() ? null : request.label().trim());
    }
    if (request.isActive() != null) {
      locker.setIsActive(request.isActive());
    }

    return toResponse(helmetLockerPort.save(locker));
  }

  @Transactional
  public void deleteLocker(UUID id) {
    UUID companyId = SecurityUtils.requireCompanyId();
    HelmetLocker locker = helmetLockerPort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "LOCKER_NOT_FOUND",
            "Ficha no encontrada"));

    if (custodiedItemRepository.existsByLockerIdAndStatus(id, CustodiedItemStatus.RECEIVED)) {
      throw new OperationException(HttpStatus.CONFLICT, "LOCKER_OCCUPIED",
          "No se puede eliminar una ficha que está en uso. Desactívala en su lugar.");
    }

    helmetLockerPort.delete(locker);
  }

  private HelmetLockerResponse toResponse(HelmetLocker locker) {
    boolean occupied = custodiedItemRepository.existsByLockerIdAndStatus(locker.getId(), CustodiedItemStatus.RECEIVED);
    return new HelmetLockerResponse(locker.getId(), locker.getCode(), locker.getLabel(),
        Boolean.TRUE.equals(locker.getIsActive()), occupied);
  }
}
