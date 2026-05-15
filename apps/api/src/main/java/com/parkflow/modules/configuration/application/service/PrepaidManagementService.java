package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.PrepaidPackage;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.PrepaidBalancePort;
import com.parkflow.modules.configuration.domain.repository.PrepaidPackagePort;
import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import com.parkflow.modules.auth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrepaidManagementService implements PrepaidUseCase {

  private final PrepaidPackagePort packageRepo;
  private final PrepaidBalancePort balanceRepo;
  private final ParkingSitePort siteRepository;
  private final AuditPort globalAuditService;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<PrepaidPackageResponse> listPackages(String site, String q, Boolean active, Pageable pageable) {
    Page<PrepaidPackage> page = packageRepo.search(site, q, active, pageable);
    return SettingsPageResponse.of(page.map(this::toPackageResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public PrepaidPackageResponse getPackage(UUID id) {
    return toPackageResponse(findPackageOrThrow(id));
  }

  @Override
  @Transactional
  public PrepaidPackageResponse createPackage(PrepaidPackageRequest req) {
    PrepaidPackage pkg = fromPackageRequest(req, new PrepaidPackage());
    pkg.setCompanyId(SecurityUtils.requireCompanyId());
    pkg = packageRepo.save(pkg);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CREAR,
            null,
            objectMapper.writeValueAsString(req),
            "Prepaid package created: " + pkg.getId());
    } catch (Exception e) {
        log.warn("No se pudo registrar auditoria global al crear paquete prepago {}", pkg.getId(), e);
    }
    return toPackageResponse(pkg);
  }

  @Override
  @Transactional
  public PrepaidPackageResponse updatePackage(UUID id, PrepaidPackageRequest req) {
    PrepaidPackage pkg = findPackageOrThrow(id);
    String before = "";
    try {
      before = objectMapper.writeValueAsString(toPackageResponse(pkg));
    } catch (Exception e) {
      log.warn("No se pudo serializar estado previo de paquete prepago {}", id, e);
    }
    fromPackageRequest(req, pkg);
    pkg = packageRepo.save(pkg);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.EDITAR,
            before,
            objectMapper.writeValueAsString(toPackageResponse(pkg)),
            "Prepaid package updated: " + id);
    } catch (Exception e) {
        log.warn("No se pudo registrar auditoria global al actualizar paquete prepago {}", id, e);
    }
    return toPackageResponse(pkg);
  }

  @Override
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

  @Override
  @Transactional(readOnly = true)
  public List<PrepaidBalanceResponse> getBalancesByPlate(String plate) {
    return balanceRepo.findAllByPlateAndCompanyIdOrderByExpiresAtAsc(plate.toUpperCase().trim(), SecurityUtils.requireCompanyId())
        .stream().map(this::toBalanceResponse).toList();
  }

  @Override
  @Transactional
  public PrepaidBalanceResponse purchase(PrepaidBalancePurchaseRequest req) {
    PrepaidPackage pkg = findPackageOrThrow(req.packageId());
    if (!pkg.isActive()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El paquete no está activo");
    }
    PrepaidBalance balance = new PrepaidBalance();
    balance.setPrepaidPackage(pkg);
    balance.setCompanyId(SecurityUtils.requireCompanyId());
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

  @Override
  @Transactional
  public PrepaidBalanceResponse deduct(UUID balanceId, int minutesToDeduct) {
    PrepaidBalance balance = balanceRepo.findById(balanceId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Saldo no encontrado"));
    if (!balance.isActive()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El saldo no está activo");
    }
    if (balance.getExpiresAt().isBefore(OffsetDateTime.now())) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El saldo ha vencido");
    }
    if (balance.getRemainingMinutes() < minutesToDeduct) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "Saldo insuficiente: disponibles " + balance.getRemainingMinutes() + " min");
    }
    balance.setRemainingMinutes(balance.getRemainingMinutes() - minutesToDeduct);
    if (balance.getRemainingMinutes() == 0) {
      balance.setActive(false);
    }
    balance.setUpdatedAt(OffsetDateTime.now());
    return toBalanceResponse(balanceRepo.save(balance));
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
