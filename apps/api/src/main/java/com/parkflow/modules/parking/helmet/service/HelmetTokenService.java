package com.parkflow.modules.parking.helmet.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.helmet.domain.HelmetToken;
import com.parkflow.modules.parking.helmet.domain.repository.HelmetTokenPort;
import com.parkflow.modules.parking.helmet.dto.BatchHelmetTokenRequest;
import com.parkflow.modules.parking.helmet.dto.HelmetTokenResponse;
import com.parkflow.modules.parking.helmet.dto.PatchHelmetTokenRequest;
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
public class HelmetTokenService {

  private final HelmetTokenPort helmetTokenPort;
  private final CustodiedItemRepository custodiedItemRepository;

  @Transactional(readOnly = true)
  public List<HelmetTokenResponse> listTokens(UUID companyId) {
    return helmetTokenPort.findByCompanyId(companyId).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<HelmetTokenResponse> listAvailableTokens(UUID companyId) {
    List<HelmetToken> all = helmetTokenPort.findActiveByCompanyId(companyId);
    return all.stream()
        .filter(l -> !custodiedItemRepository.existsByTokenIdAndStatus(l.getId(), CustodiedItemStatus.RECEIVED))
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public HelmetTokenResponse createToken(String code, String label) {
    UUID companyId = SecurityUtils.requireCompanyId();
    if (helmetTokenPort.existsByCompanyIdAndCode(companyId, code.trim())) {
      throw new OperationException(HttpStatus.CONFLICT, "CODE_DUPLICATED",
          "Ya existe una ficha con el código: " + code);
    }
    HelmetToken token = HelmetToken.builder()
        .companyId(companyId)
        .code(code.trim())
        .label(label != null ? label.trim() : null)
        .isActive(true)
        .build();
    return toResponse(helmetTokenPort.save(token));
  }

  @Transactional
  public List<HelmetTokenResponse> createBatch(BatchHelmetTokenRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    String prefix = request.prefix() != null ? request.prefix().trim() : "";
    List<HelmetTokenResponse> results = new ArrayList<>();

    for (int i = request.start(); i <= request.end(); i++) {
      String code = prefix + String.format("%02d", i);
      if (helmetTokenPort.existsByCompanyIdAndCode(companyId, code)) {
        continue;
      }
      HelmetToken token = HelmetToken.builder()
          .companyId(companyId)
          .code(code)
          .label("Casillero " + code)
          .isActive(true)
          .build();
      results.add(toResponse(helmetTokenPort.save(token)));
    }
    return results;
  }

  @Transactional
  public HelmetTokenResponse patchToken(UUID id, PatchHelmetTokenRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    HelmetToken token = helmetTokenPort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "TOKEN_NOT_FOUND",
            "Ficha no encontrada"));

    if (request.code() != null) {
      String newCode = request.code().trim();
      if (!newCode.equals(token.getCode()) && helmetTokenPort.existsByCompanyIdAndCode(companyId, newCode)) {
        throw new OperationException(HttpStatus.CONFLICT, "CODE_DUPLICATED",
            "Ya existe otra ficha con el código: " + newCode);
      }
      token.setCode(newCode);
    }
    if (request.label() != null) {
      token.setLabel(request.label().isBlank() ? null : request.label().trim());
    }
    if (request.isActive() != null) {
      token.setIsActive(request.isActive());
    }

    return toResponse(helmetTokenPort.save(token));
  }

  @Transactional
  public void deleteToken(UUID id) {
    UUID companyId = SecurityUtils.requireCompanyId();
    HelmetToken token = helmetTokenPort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "TOKEN_NOT_FOUND",
            "Ficha no encontrada"));

    if (custodiedItemRepository.existsByTokenIdAndStatus(id, CustodiedItemStatus.RECEIVED)) {
      throw new OperationException(HttpStatus.CONFLICT, "TOKEN_OCCUPIED",
          "No se puede eliminar una ficha que está en uso. Desactívala en su lugar.");
    }

    helmetTokenPort.delete(token);
  }

  private HelmetTokenResponse toResponse(HelmetToken token) {
    boolean occupied = custodiedItemRepository.existsByTokenIdAndStatus(token.getId(), CustodiedItemStatus.RECEIVED);
    return new HelmetTokenResponse(token.getId(), token.getCode(), token.getLabel(),
        Boolean.TRUE.equals(token.getIsActive()), occupied);
  }
}
