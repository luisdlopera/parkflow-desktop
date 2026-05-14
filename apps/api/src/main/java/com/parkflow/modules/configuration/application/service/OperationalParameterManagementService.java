package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.application.port.in.OperationalParameterUseCase;
import com.parkflow.modules.configuration.dto.OperationalParameterRequest;
import com.parkflow.modules.configuration.dto.OperationalParameterResponse;
import com.parkflow.modules.configuration.entity.OperationalParameter;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.repository.OperationalParameterRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.exception.OperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperationalParameterManagementService implements OperationalParameterUseCase {

  private final OperationalParameterRepository operationalParameterRepository;
  private final ParkingSiteRepository parkingSiteRepository;

  @Override
  @Transactional(readOnly = true)
  public OperationalParameterResponse getBySite(UUID siteId) {
    OperationalParameter params = operationalParameterRepository.findBySite_Id(siteId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Parámetros no encontrados para esta sede"));
    return toResponse(params);
  }

  @Override
  @Transactional
  public OperationalParameterResponse createOrUpdate(UUID siteId, OperationalParameterRequest req) {
    ParkingSite site = parkingSiteRepository.findById(siteId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));

    OperationalParameter params = operationalParameterRepository.findBySite_Id(siteId)
        .orElse(new OperationalParameter());

    params.setSite(site);
    params.setAllowEntryWithoutPrinter(req.allowEntryWithoutPrinter());
    params.setAllowExitWithoutPayment(req.allowExitWithoutPayment());
    params.setAllowReprint(req.allowReprint());
    params.setAllowVoid(req.allowVoid());
    params.setRequirePhotoEntry(req.requirePhotoEntry());
    params.setRequirePhotoExit(req.requirePhotoExit());
    params.setToleranceMinutes(req.toleranceMinutes());
    params.setMaxTimeNoCharge(req.maxTimeNoCharge());
    params.setLegalMessage(trimToNull(req.legalMessage()));
    params.setOfflineModeEnabled(req.offlineModeEnabled());

    if (params.getCreatedAt() == null) {
      params.setCreatedAt(OffsetDateTime.now());
    }
    params.setUpdatedAt(OffsetDateTime.now());

    params = operationalParameterRepository.save(params);
    return toResponse(params);
  }

  private OperationalParameterResponse toResponse(OperationalParameter p) {
    return new OperationalParameterResponse(
        p.getId(), p.getSite().getId(), p.isAllowEntryWithoutPrinter(),
        p.isAllowExitWithoutPayment(), p.isAllowReprint(), p.isAllowVoid(),
        p.isRequirePhotoEntry(), p.isRequirePhotoExit(), p.getToleranceMinutes(),
        p.getMaxTimeNoCharge(), p.getLegalMessage(), p.isOfflineModeEnabled(),
        p.getCreatedAt(), p.getUpdatedAt());
  }

  private static String trimToNull(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }
}
