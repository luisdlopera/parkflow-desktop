package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.PrepaidPackage;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.PrepaidBalancePort;
import com.parkflow.modules.configuration.domain.repository.PrepaidPackagePort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.common.exception.OperationException;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles prepaid management operations: packages CRUD, balance operations.
 * Max 4 methods as per hexagonal architecture.
 */
@Service
@RequiredArgsConstructor
public class PrepaidManagementService {

  private final PrepaidPackagePort packageRepo;
  private final PrepaidBalancePort balanceRepo;
  private final ParkingSitePort siteRepository;
  private final com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Transactional
  public PrepaidPackageResponse createPackage(PrepaidPackageRequest req) {
    PrepaidPackage pkg = fromPackageRequest(req, new PrepaidPackage());
    pkg = packageRepo.save(pkg);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CREAR,
            null,
            objectMapper.writeValueAsString(req),
            "Prepaid package created: " + pkg.getId());
    } catch (Exception e) {
        // ignore
    }
    return toPackageResponse(pkg);
  }

  @Transactional
  public PrepaidPackageResponse updatePackage(UUID id, PrepaidPackageRequest req) {
    PrepaidPackage pkg = findPackageOrThrow(id);
    String before = "";
    try { before = objectMapper.writeValueAsString(toPackageResponse(pkg)); } catch(Exception e) {}
    fromPackageRequest(req, pkg);
    pkg = packageRepo.save(pkg);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.EDITAR,
            before,
            objectMapper.writeValueAsString(toPackageResponse(pkg)),
            "Prepaid package updated: " + id);
    } catch (Exception e) {
        // ignore
    }
    return toPackageResponse(pkg);
  }

  @Transactional
  public PrepaidPackageResponse patchPackageStatus(UUID id, boolean active) {
    PrepaidPackage pkg = findPackageOrThrow(id);
    boolean previous = pkg.isActive();
    pkg.setActive(active);
    pkg.setUpdatedAt(OffsetDateTime.now());
    pkg = packageRepo.save(pkg);
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.ELIMINAR,
        "active=" + previous,
        "active=" + active,
        "Prepaid package status changed: " + id);
    return toPackageResponse(pkg);
  }

  @Transactional
  public PrepaidBalanceResponse purchase(PrepaidBalancePurchaseRequest req) {
    PrepaidPackage pkg = findPackageOrThrow(req.packageId());
    if (!pkg.isActive()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El paquete no está activo");
    }
    PrepaidBalance balance = new PrepaidBalance();
    balance.setPrepaidPackage(pkg);
    balance.setPlate(req.plate().toUpperCase().trim());
    balance.setHolderName(req.holderName());
    balance.setRemainingMinutes(pkg.getHoursIncluded() * 60);
    balance.setPurchasedAt(OffsetDateTime.now());
    balance.setExpiresAt(OffsetDateTime.now().plusDays(pkg.getExpiresDays()));
    balance.setActive(true);
    balance = balanceRepo.save(balance);
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.CREAR,
        null,
        "Purchase package: " + pkg.getName() + " for plate: " + req.plate(),
        "Balance ID: " + balance.getId());
    return toBalanceResponse(balance);
  }

  private PrepaidPackage fromPackageRequest(PrepaidPackageRequest req, PrepaidPackage target) {
    target.setName(req.name().trim());
    target.setHoursIncluded(req.hoursIncluded());
    target.setAmount(req.amount());
    target.setVehicleType(req.vehicleType());
    target.setSite(req.site());
    if (req.siteId() != null) {
      ParkingSite site = siteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      target.setSiteRef(site);
    }
    target.setExpiresDays(req.expiresDays() <= 0 ? 30 : req.expiresDays());
    target.setActive(req.active());
    target.setUpdatedAt(OffsetDateTime.now());
    return target;
  }

  private PrepaidPackage findPackageOrThrow(UUID id) {
    return packageRepo.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Paquete no encontrado"));
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
