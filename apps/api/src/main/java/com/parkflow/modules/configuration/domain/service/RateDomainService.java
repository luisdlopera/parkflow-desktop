package com.parkflow.modules.configuration.domain.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RateDomainService {
  private final RatePort ratePort;

  public void validateRate(Rate rate, UUID excludeId, UUID companyId) {
    validateSchedule(rate);
    validateMinMax(rate);
    checkConflicts(rate, excludeId, companyId);
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

  private void validateMinMax(Rate rate) {
    var min = rate.getMinSessionValue();
    var max = rate.getMaxSessionValue();
    if (min != null && max != null && min.compareTo(max) > 0) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "El valor mínimo de sesión no puede ser mayor que el valor máximo");
    }
  }

  private void checkConflicts(Rate rate, UUID excludeId, UUID companyId) {
    if (!rate.isActive()) return;

    UUID ex = excludeId != null ? excludeId : UUID.randomUUID();
    var others = ratePort.findActiveForConflictCheck(rate.getSite(), rate.getVehicleType(), ex, companyId);
    
    Win win = toWindow(rate);
    for (Rate other : others) {
      if (!other.getRateType().equals(rate.getRateType())) continue;
      
      Win ow = toWindow(other);
      if (overlap(win, ow)) {
        throw new OperationException(
            HttpStatus.CONFLICT,
            "Conflicto con otra tarifa activa del mismo tipo y franja horaria para este vehiculo/sede");
      }
    }
  }

  private record Win(int start, int end) {}

  private Win toWindow(Rate r) {
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
}
