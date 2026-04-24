package com.parkflow.modules.settings.service;

import com.parkflow.modules.settings.dto.ParkingParametersData;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.util.StringUtils;

public final class ParkingParametersValidator {
  private static final Set<String> LOST_TICKET_POLICIES =
      Set.of("SURCHARGE_RATE", "BLOCK_EXIT", "SUPERVISOR_ONLY");

  private ParkingParametersValidator() {}

  public static List<String> validate(ParkingParametersData d) {
    List<String> errors = new ArrayList<>();
    if (d == null) {
      errors.add("payload requerido");
      return errors;
    }
    if (!StringUtils.hasText(d.getParkingName())) {
      errors.add("nombre del parqueadero es obligatorio");
    }
    if (!StringUtils.hasText(d.getCurrency())) {
      errors.add("moneda es obligatoria");
    }
    if (!StringUtils.hasText(d.getTimeZone())) {
      errors.add("zona horaria es obligatoria");
    }
    if (StringUtils.hasText(d.getLostTicketPolicy())) {
      String p = d.getLostTicketPolicy().trim();
      if (!LOST_TICKET_POLICIES.contains(p)) {
        errors.add(
            "politica de ticket perdido invalida; use: SURCHARGE_RATE, BLOCK_EXIT o SUPERVISOR_ONLY");
      }
    }
    if (d.getGraceMinutesDefault() != null && d.getGraceMinutesDefault() < 0) {
      errors.add("minutos de gracia no pueden ser negativos");
    }
    if (d.getMaxReprints() != null && d.getMaxReprints() < 0) {
      errors.add("maximo de reimpresiones invalido");
    }
    if (d.getSyncIntervalSeconds() != null && d.getSyncIntervalSeconds() < 10) {
      errors.add("intervalo de sincronizacion debe ser al menos 10 segundos");
    }
    if (d.getPrintTimeoutSeconds() != null && d.getPrintTimeoutSeconds() < 1) {
      errors.add("tiempo de espera de impresion invalido");
    }
    if (d.getDefaultPaperWidthMm() != null) {
      int w = d.getDefaultPaperWidthMm();
      if (w != 58 && w != 80 && w != 72) {
        errors.add("ancho de papel debe ser 58, 72 u 80 mm");
      }
    }
    if (Boolean.TRUE.equals(d.getAllowReprint())
        && d.getMaxReprints() != null
        && d.getMaxReprints() == 0) {
      errors.add("reimpresion permitida requiere maximo de reimpresiones mayor a 0");
    }
    if (StringUtils.hasText(d.getDefaultPrinterName())
        && d.getDefaultPaperWidthMm() == null) {
      errors.add("defina ancho de papel cuando hay impresora por defecto");
    }
    if (d.getCashOfflineMaxManualMovement() != null
        && d.getCashOfflineMaxManualMovement().signum() < 0) {
      errors.add("tope de caja offline no puede ser negativo");
    }
    return errors;
  }
}
