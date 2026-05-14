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
    if (StringUtils.hasText(d.getLogoUrl())) {
      String logo = d.getLogoUrl().trim();
      if (logo.length() > 500) {
        errors.add("URL de logo demasiado larga");
      } else if (!logo.regionMatches(true, 0, "https://", 0, 8)
          && !logo.regionMatches(true, 0, "http://", 0, 7)
          && !logo.regionMatches(true, 0, "data:image/", 0, 11)) {
        errors.add("logo debe iniciar en http(s):// o data:image/");
      }
    }
    if (StringUtils.hasText(d.getBrandColor())
        && !d.getBrandColor().trim().matches("^#[0-9A-Fa-f]{6}$")) {
      errors.add("color de marca debe ser hexadecimal, ej. #F97316");
    }
    if (StringUtils.hasText(d.getTaxName()) && d.getTaxName().trim().length() > 40) {
      errors.add("nombre de impuesto maximo 40 caracteres");
    }
    if (d.getTaxRatePercent() != null
        && (d.getTaxRatePercent().signum() < 0
            || d.getTaxRatePercent().compareTo(new java.math.BigDecimal("100")) > 0)) {
      errors.add("porcentaje de impuesto debe estar entre 0 y 100");
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
    if (StringUtils.hasText(d.getTicketHeaderMessage())
        && d.getTicketHeaderMessage().length() > 500) {
      errors.add("mensaje encabezado ticket maximo 500 caracteres");
    }
    if (StringUtils.hasText(d.getTicketLegalMessage())
        && d.getTicketLegalMessage().length() > 1000) {
      errors.add("mensaje legal ticket maximo 1000 caracteres");
    }
    if (StringUtils.hasText(d.getTicketFooterMessage())
        && d.getTicketFooterMessage().length() > 500) {
      errors.add("mensaje pie ticket maximo 500 caracteres");
    }
    if (StringUtils.hasText(d.getOperationRulesMessage())
        && d.getOperationRulesMessage().length() > 1200) {
      errors.add("reglas de operacion maximo 1200 caracteres");
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
    if (StringUtils.hasText(d.getTaxId()) && d.getTaxId().trim().length() > 15) {
      errors.add("NIT debe tener como maximo 15 caracteres");
    }
    if (StringUtils.hasText(d.getTaxIdCheckDigit()) && d.getTaxIdCheckDigit().trim().length() > 2) {
      errors.add("digito verificacion NIT invalido");
    }
    if (StringUtils.hasText(d.getDianResolutionDate())
        && !d.getDianResolutionDate().trim().matches("\\d{4}-\\d{2}-\\d{2}")) {
      errors.add("fecha resolucion DIAN use formato YYYY-MM-DD");
    }
    if (StringUtils.hasText(d.getDianTechnicalKey()) && d.getDianTechnicalKey().length() > 500) {
      errors.add("clave tecnica muy larga (max 500)");
    }
    if (StringUtils.hasText(d.getDianInvoicePrefix()) && d.getDianInvoicePrefix().length() > 20) {
      errors.add("prefijo FE maximo 20 caracteres");
    }
    if (StringUtils.hasText(d.getDianResolutionNumber()) && d.getDianResolutionNumber().length() > 40) {
      errors.add("numero resolucion maximo 40 caracteres");
    }
    if (StringUtils.hasText(d.getDianRangeFrom()) && d.getDianRangeFrom().length() > 30) {
      errors.add("rango inicial invalido");
    }
    if (StringUtils.hasText(d.getDianRangeTo()) && d.getDianRangeTo().length() > 30) {
      errors.add("rango final invalido");
    }
    if (StringUtils.hasText(d.getBusinessLegalName()) && d.getBusinessLegalName().length() > 200) {
      errors.add("razon social maximo 200 caracteres");
    }
    if (StringUtils.hasText(d.getCashFeOutboundWebhookBearer())
        && !StringUtils.hasText(d.getCashFeOutboundWebhookUrl())) {
      errors.add("Bearer webhook requiere URL de webhook");
    }
    if (StringUtils.hasText(d.getCashFeOutboundWebhookUrl())) {
      String u = d.getCashFeOutboundWebhookUrl().trim();
      if (u.length() > 500) {
        errors.add("URL webhook demasiado larga");
      } else if (!u.regionMatches(true, 0, "https://", 0, 8)
          && !u.regionMatches(true, 0, "http://", 0, 7)) {
        errors.add("URL webhook debe iniciar en http(s)://");
      }
    }
    if (StringUtils.hasText(d.getCashFeOutboundWebhookBearer())
        && d.getCashFeOutboundWebhookBearer().length() > 2000) {
      errors.add("bearer/token webhook demasiado largo");
    }
    if (Boolean.TRUE.equals(d.getCashFeSequentialEnabled())
        && d.getCashFeSequenceDigits() != null) {
      int dig = d.getCashFeSequenceDigits();
      if (dig < 6 || dig > 13) {
        errors.add("digitos correlativo FE soporte debe estar entre 6 y 13");
      }
    }
    return errors;
  }
}
