package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.PrepaidPackage;
import com.parkflow.modules.configuration.infrastructure.persistence.PrepaidBalanceRepository;
import com.parkflow.modules.configuration.infrastructure.persistence.PrepaidPackageRepository;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles prepaid query operations: list, get, search.
 * Max 4 methods (read-only queries).
 */
@Service
@RequiredArgsConstructor
public class PrepaidQueryService {

  private final PrepaidPackageRepository packageRepo;
  private final PrepaidBalanceRepository balanceRepo;

  @Transactional(readOnly = true)
  public SettingsPageResponse<PrepaidPackageResponse> listPackages(
      String site, String q, Boolean active, Pageable pageable) {
    Page<PrepaidPackage> page = packageRepo.search(site, q, active, pageable);
    return SettingsPageResponse.of(page.map(this::toPackageResponse));
  }

  @Transactional(readOnly = true)
  public PrepaidPackageResponse getPackage(UUID id) {
    return toPackageResponse(findPackageOrThrow(id));
  }

  @Transactional(readOnly = true)
  public List<PrepaidBalanceResponse> getBalancesByPlate(String plate) {
    return balanceRepo.findAllByPlateOrderByExpiresAtAsc(plate.toUpperCase().trim())
        .stream().map(this::toBalanceResponse).toList();
  }

  private PrepaidPackage findPackageOrThrow(UUID id) {
    return packageRepo.findById(id)
        .orElseThrow(() -> new com.parkflow.modules.common.exception.OperationException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Paquete no encontrado"));
  }

  private PrepaidPackageResponse toPackageResponse(PrepaidPackage p) {
    return new PrepaidPackageResponse(
        p.getId(), p.getName(), p.getHoursIncluded(), p.getAmount(),
        p.getVehicleType(), p.getSite(),
        p.getSiteRef() != null ? p.getSiteRef().getId() : null,
        p.getExpiresDays(), p.isActive(), p.getCreatedAt(), p.getUpdatedAt());
  }

  private PrepaidBalanceResponse toBalanceResponse(PrepaidBalance b) {
    return new PrepaidBalanceResponse(
        b.getId(),
        b.getPrepaidPackage().getId(),
        b.getPrepaidPackage().getName(),
        b.getPlate(),
        b.getHolderName(),
        b.getRemainingMinutes(),
        b.getPurchasedAt(),
        b.getExpiresAt(),
        b.isActive(),
        b.getCreatedAt(),
        b.getUpdatedAt());
  }
}
