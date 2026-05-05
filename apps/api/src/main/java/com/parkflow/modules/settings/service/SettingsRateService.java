package com.parkflow.modules.settings.service;

import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateStatusRequest;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SettingsRateService {
  private final RateRepository rateRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final SettingsAuditService settingsAuditService;
  private final com.parkflow.modules.settings.repository.MasterVehicleTypeRepository vehicleTypeRepository;
  private final ParkingSiteRepository parkingSiteRepository;

  @Transactional(readOnly = true)
  public SettingsPageResponse<RateResponse> list(
      String site, String q, Boolean active, Pageable pageable) {
    String s = site == null || site.isBlank() ? "DEFAULT" : site.trim();
    Page<Rate> page = rateRepository.search(s, q, active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public RateResponse get(UUID id) {
    Rate rate =
        rateRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    return toResponse(rate);
  }

  @Transactional
  public RateResponse create(RateUpsertRequest req) {
    Rate rate = fromRequest(req, new Rate());
    applyBusinessRules(rate, null);
    try {
      rate = rateRepository.save(rate);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(
          HttpStatus.CONFLICT, "Ya existe una tarifa activa con el mismo nombre en esta sede");
    }
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_RATE_CREATE,
        "OK",
        Map.of("rateId", rate.getId().toString(), "name", rate.getName()));
    return toResponse(rate);
  }

  @Transactional
  public RateResponse update(UUID id, RateUpsertRequest req) {
    Rate rate =
        rateRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    Map<String, Object> before = snapshot(rate);
    Rate updated = fromRequest(req, rate);
    applyBusinessRules(updated, id);
    try {
      updated = rateRepository.save(updated);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(
          HttpStatus.CONFLICT, "Ya existe una tarifa activa con el mismo nombre en esta sede");
    }
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_RATE_UPDATE,
        "OK",
        Map.of("rateId", id.toString(), "before", before, "after", snapshot(updated)));
    return toResponse(updated);
  }

  @Transactional
  public RateResponse patchStatus(UUID id, RateStatusRequest req) {
    Rate rate =
        rateRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    boolean previous = rate.isActive();
    rate.setActive(req.active());
    rate.setUpdatedAt(OffsetDateTime.now());
    applyBusinessRules(rate, id);
    rate = rateRepository.save(rate);
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_RATE_STATUS,
        "OK",
        Map.of("rateId", id.toString(), "previousActive", previous, "active", rate.isActive()));
    return toResponse(rate);
  }

  @Transactional
  public void delete(UUID id) {
    Rate rate =
        rateRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    long refs = parkingSessionRepository.countByRate_Id(id);
    if (refs > 0) {
      throw new OperationException(
          HttpStatus.CONFLICT,
          "No se puede eliminar: existen sesiones asociadas; inactivela en su lugar");
    }
    rateRepository.delete(rate);
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_RATE_DELETE, "OK", Map.of("rateId", id.toString(), "name", rate.getName()));
  }

  private void validateSchedule(Rate rate) {
    boolean hasFrom = rate.getScheduledActiveFrom() != null;
    boolean hasTo = rate.getScheduledActiveTo() != null;
    if (hasFrom != hasTo) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "Vigencia programada: indique inicio y fin, o deje ambos vacios");
    }
    if (hasFrom && rate.getScheduledActiveFrom().isAfter(rate.getScheduledActiveTo())) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST, "Vigencia programada: el inicio no puede ser posterior al fin");
    }
  }

  private void applyBusinessRules(Rate rate, UUID excludeId) {
    validateSchedule(rate);
    
    if (rate.getVehicleType() != null) {
      vehicleTypeRepository.findByCode(rate.getVehicleType())
          .orElseThrow(() -> new OperationException(HttpStatus.BAD_REQUEST, "El tipo de vehículo no existe en los maestros"));
    }

    if (!rate.isActive()) {
      return;
    }
    UUID ex = excludeId != null ? excludeId : UUID.randomUUID();
    var others = rateRepository.findActiveForConflictCheck(rate.getSite(), rate.getVehicleType(), ex);
    Win win = toWindowOrFull(rate);
    for (Rate other : others) {
      if (!other.getRateType().equals(rate.getRateType())) {
        continue;
      }
      if (rate.getId() != null && other.getId().equals(rate.getId())) {
        continue;
      }
      Win ow = toWindowOrFull(other);
      if (overlap(win, ow)) {
        throw new OperationException(
            HttpStatus.CONFLICT,
            "Conflicto con otra tarifa activa del mismo tipo y franja horaria para este vehiculo/sede");
      }
    }
  }

  private record Win(int start, int end) {}

  private Win toWindowOrFull(Rate r) {
    if (r.getWindowStart() == null && r.getWindowEnd() == null) {
      return new Win(0, 24 * 60);
    }
    if (r.getWindowStart() == null || r.getWindowEnd() == null) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "Franja horaria incompleta: indique hora inicio y fin, o deje ambas vacias (24h)");
    }
    int s = r.getWindowStart().getHour() * 60 + r.getWindowStart().getMinute();
    int e = r.getWindowEnd().getHour() * 60 + r.getWindowEnd().getMinute();
    if (e <= s) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST, "La hora fin debe ser mayor que la hora inicio (mismo dia)");
    }
    return new Win(s, e);
  }

  private boolean overlap(Win a, Win b) {
    return a.start < b.end && b.start < a.end;
  }

  private Rate fromRequest(RateUpsertRequest req, Rate target) {
    target.setName(req.name().trim());
    target.setVehicleType(req.vehicleType());
    target.setRateType(req.rateType());
    target.setAmount(req.amount());
    target.setGraceMinutes(req.graceMinutes());
    target.setToleranceMinutes(req.toleranceMinutes());
    target.setFractionMinutes(req.fractionMinutes());
    target.setRoundingMode(req.roundingMode());
    target.setLostTicketSurcharge(req.lostTicketSurcharge());
    target.setActive(req.active());
    target.setSite(req.site().trim());
    if (req.siteId() != null) {
      ParkingSite site = parkingSiteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      target.setSiteRef(site);
    }
    target.setBaseValue(req.baseValue() != null ? req.baseValue() : BigDecimal.ZERO);
    target.setBaseMinutes(req.baseMinutes());
    target.setAdditionalValue(req.additionalValue() != null ? req.additionalValue() : BigDecimal.ZERO);
    target.setAdditionalMinutes(req.additionalMinutes());
    target.setMaxDailyValue(req.maxDailyValue());
    target.setAppliesNight(req.appliesNight());
    target.setAppliesHoliday(req.appliesHoliday());
    target.setWindowStart(req.windowStart());
    target.setWindowEnd(req.windowEnd());
    target.setScheduledActiveFrom(req.scheduledActiveFrom());
    target.setScheduledActiveTo(req.scheduledActiveTo());
    target.setUpdatedAt(OffsetDateTime.now());
    return target;
  }

  private RateResponse toResponse(Rate r) {
    return new RateResponse(
        r.getId(),
        r.getName(),
        r.getVehicleType(),
        r.getRateType(),
        r.getAmount(),
        r.getGraceMinutes(),
        r.getToleranceMinutes(),
        r.getFractionMinutes(),
        r.getRoundingMode(),
        r.getLostTicketSurcharge(),
        r.isActive(),
        r.getSite(),
        r.getSiteRef() != null ? r.getSiteRef().getId() : null,
        r.getBaseValue(),
        r.getBaseMinutes(),
        r.getAdditionalValue(),
        r.getAdditionalMinutes(),
        r.getMaxDailyValue(),
        r.isAppliesNight(),
        r.isAppliesHoliday(),
        r.getWindowStart(),
        r.getWindowEnd(),
        r.getScheduledActiveFrom(),
        r.getScheduledActiveTo(),
        r.getCreatedAt(),
        r.getUpdatedAt());
  }

  private Map<String, Object> snapshot(Rate r) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("name", r.getName());
    m.put("vehicleType", r.getVehicleType() != null ? r.getVehicleType() : null);
    m.put("rateType", r.getRateType().name());
    m.put("amount", r.getAmount());
    m.put("active", r.isActive());
    m.put("site", r.getSite());
    return m;
  }
}
