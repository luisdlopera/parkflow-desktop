package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.settings.infrastructure.persistence.MasterVehicleTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class RateValidationService {

    public void validateSchedule(Rate rate) {
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

    public void validateMinMax(Rate rate) {
        BigDecimal min = rate.getMinSessionValue();
        BigDecimal max = rate.getMaxSessionValue();
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new OperationException(
                HttpStatus.BAD_REQUEST,
                "El valor mínimo de sesión no puede ser mayor que el valor máximo");
        }
    }

    public void validateVehicleType(Rate rate, MasterVehicleTypeRepository vehicleTypeRepository) {
        if (rate.getVehicleType() != null) {
            vehicleTypeRepository
                .findByCode(rate.getVehicleType())
                .orElseThrow(
                    () ->
                        new OperationException(
                            HttpStatus.BAD_REQUEST, "El tipo de vehículo no existe en los maestros"));
        }
    }

    public void validateOverlap(Rate rate, List<Rate> others) {
        if (!rate.isActive()) {
            return;
        }
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
        if (e <= s) e += 24 * 60;
        return new Win(s, e);
    }

    private boolean overlap(Win a, Win b) {
        return a.start < b.end && b.start < a.end;
    }
}
