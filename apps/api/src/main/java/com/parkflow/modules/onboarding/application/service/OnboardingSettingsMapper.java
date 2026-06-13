package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OnboardingSettingsMapper {

  private final FeatureAccessService featureAccessService;

  public Map<String, Object> sanitizeStepDataByPlan(Company company, int step, Map<String, Object> data) {
    Map<String, Object> out = new LinkedHashMap<>(data);
    Map<String, Object> access = featureAccessService.getAvailableOptionsByPlan(company.getPlan());
    if (step == 6) {
      List<String> allowedPayments = asStringList(access.get("paymentMethods"), List.of("EFECTIVO"));
      List<String> current = asStringList(out.get("paymentMethods"), List.of("EFECTIVO"));
      out.put("paymentMethods", current.stream().filter(allowedPayments::contains).toList());
    }
    if ((step == 8 || step == 9) && Boolean.FALSE.equals(access.get("allowAgreementsAndMonthly"))) {
      out.put("enabled", false);
    }
    if (step == 10 && Boolean.FALSE.equals(access.get("allowMultiLocation"))) {
      out.put("multiSite", false);
    }
    if (step == 11 && Boolean.FALSE.equals(access.get("allowAdvancedPermissions"))) {
      out.put("advanced", false);
    }
    return out;
  }

  public Map<String, Object> buildSettingsFromProgress(Company company, Map<String, Object> progressData) {
    if (progressData == null || progressData.isEmpty()) {
      return defaultConfiguration(company);
    }
    Map<String, Object> step1 = stepMap(progressData, 1);
    Map<String, Object> step2 = stepMap(progressData, 2);
    Map<String, Object> step3 = stepMap(progressData, 3);
    Map<String, Object> step4 = stepMap(progressData, 4);
    Map<String, Object> step5 = stepMap(progressData, 5);
    Map<String, Object> step6 = stepMap(progressData, 6);
    Map<String, Object> step7 = stepMap(progressData, 7);
    Map<String, Object> step8 = stepMap(progressData, 8);
    Map<String, Object> step9 = stepMap(progressData, 9);
    Map<String, Object> step10 = stepMap(progressData, 10);
    Map<String, Object> step11 = stepMap(progressData, 11);

    String opStr = String.valueOf(step1.getOrDefault("operationalProfile", step1.getOrDefault("businessModel", "MIXED")));
    OperationalProfile op = OperationalProfile.MIXED;
    try {
      op = OperationalProfile.valueOf(opStr);
    } catch (Exception e) {
      op = inferOperationalProfile(step1);
    }

    List<String> vehicleTypes;
    if (op == OperationalProfile.MOTORCYCLE_ONLY) {
      vehicleTypes = List.of("MOTORCYCLE");
    } else if (op == OperationalProfile.CAR_ONLY) {
      vehicleTypes = List.of("CAR");
    } else {
      List<String> rawTypes = asStringList(step1.get("vehicleTypes"), List.of("MOTO", "CARRO"));
      vehicleTypes = rawTypes.stream().map(this::mapVehicleTypeCode).toList();
    }

    List<String> rawPayments = asStringList(step6.get("paymentMethods"), List.of("EFECTIVO"));
    List<String> paymentMethods = rawPayments.stream().map(this::mapPaymentMethodCode).toList();
    
    boolean multiSite = Boolean.TRUE.equals(step10.get("multiSite"));
    List<Map<String, String>> sites = multiSite
        ? List.of(Map.of("code", "PRINCIPAL", "name", String.valueOf(step10.getOrDefault("siteName1", "Sede principal"))), 
                  Map.of("code", "SECUNDARIA", "name", String.valueOf(step10.getOrDefault("siteName2", "Sede secundaria"))))
        : List.of(Map.of("code", "PRINCIPAL", "name", String.valueOf(step10.getOrDefault("siteName1", "Sede principal"))));

    Map<String, Object> capacity = new LinkedHashMap<>();
    capacity.put("controlSlots", Boolean.TRUE.equals(step2.get("controlSlots")));
    capacity.put("total", extractNumber(step2.get("totalCapacity"), 0));
    capacity.put("byType", extractMap(step2.get("capacityByType")));

    Map<String, Object> rates = new LinkedHashMap<>();
    rates.put("type", "HOURLY");
    rates.put("baseValue", extractNumber(step3.get("baseValue"), 0));
    rates.put("byType", extractMap(step3.get("ratesByType")));
    rates.put("minRateMinutes", extractNumber(step3.get("minRateMinutes"), 0));
    rates.put("dailyRate", extractNumber(step3.get("dailyRate"), 0));
    rates.put("nightRate", extractNumber(step3.get("nightRate"), 0));
    rates.put("graceMinutes", extractNumber(step3.get("graceMinutes"), 0));

    Map<String, Object> region = new LinkedHashMap<>();
    region.put("countryCode", String.valueOf(step4.getOrDefault("countryCode", "CO")));
    region.put("platePattern", String.valueOf(step4.getOrDefault("platePattern", "ABC123")));
    region.put("platePrefix", String.valueOf(step4.getOrDefault("platePrefix", "")));

    Map<String, Object> tickets = new LinkedHashMap<>();
    tickets.put("delivery", List.of("PRINT"));
    tickets.put("allowReprint", Boolean.TRUE.equals(step7.get("allowReprint")));
    tickets.put("showTicketPreview", Boolean.TRUE.equals(step7.get("showTicketPreview")));
    tickets.put("printerType", String.valueOf(step7.getOrDefault("printerType", "NONE")));
    tickets.put("printerName", String.valueOf(step7.getOrDefault("printerName", "")));
    tickets.put("thermalPrinter", "THERMAL".equals(step7.get("printerType")));

    Map<String, Object> shifts = new LinkedHashMap<>();
    shifts.put("enabled", Boolean.TRUE.equals(step5.get("enabled")));
    if (Boolean.TRUE.equals(step5.get("enabled"))) {
      shifts.put("dayShiftStart", String.valueOf(step5.getOrDefault("dayShiftStart", "06:00")));
      shifts.put("dayShiftEnd", String.valueOf(step5.getOrDefault("dayShiftEnd", "18:00")));
      shifts.put("nightShiftStart", String.valueOf(step5.getOrDefault("nightShiftStart", "18:00")));
      shifts.put("nightShiftEnd", String.valueOf(step5.getOrDefault("nightShiftEnd", "06:00")));
    }

    Map<String, Object> agreements = new LinkedHashMap<>();
    agreements.put("enabled", Boolean.TRUE.equals(step9.get("enabled")));
    agreements.put("discount", extractNumber(step9.get("agreementDiscount"), 0));

    boolean enableHelmet = vehicleTypes.contains("MOTORCYCLE") && Boolean.TRUE.equals(step8.get("enableHelmetSection"));

    Map<String, Object> operationConfiguration = new LinkedHashMap<>();
    operationConfiguration.put("defaultVehicleType", vehicleTypes.isEmpty() ? "CAR" : vehicleTypes.get(0));
    operationConfiguration.put("defaultVisitorType", "VISITOR");
    operationConfiguration.put("enableCustodiedItem", enableHelmet);
    operationConfiguration.put("showAdvancedSection", Boolean.TRUE.equals(step11.get("advanced")));
    operationConfiguration.put("countryCode", String.valueOf(step4.getOrDefault("countryCode", "CO")));
    operationConfiguration.put("platePrefix", String.valueOf(step4.getOrDefault("platePrefix", "")));
    operationConfiguration.put("platePattern", String.valueOf(step4.getOrDefault("platePattern", "ABC123")));

    Map<String, Object> settings = new LinkedHashMap<>();
    settings.put("plan", company.getPlan().name());
    settings.put("vehicleTypes", vehicleTypes);
    settings.put("paymentMethods", paymentMethods);
    settings.put("sites", sites);
    settings.put("capacity", capacity);
    settings.put("rates", rates);
    settings.put("region", region);
    settings.put("tickets", tickets);
    settings.put("shifts", shifts);
    settings.put("agreements", agreements);
    settings.put("operationConfiguration", operationConfiguration);
    settings.put("wizard", progressData);
    settings.put("modules", inferModules(progressData));
    return settings;
  }

  public Map<String, Object> defaultConfiguration(Company company) {
    Map<String, Object> capacity = new LinkedHashMap<>();
    capacity.put("controlSlots", false);
    capacity.put("total", 0);
    capacity.put("byType", Map.of());

    Map<String, Object> rates = new LinkedHashMap<>();
    rates.put("type", "HOURLY");
    rates.put("baseValue", 0);
    rates.put("byType", Map.of());
    rates.put("minRateMinutes", 0);
    rates.put("dailyRate", 0);
    rates.put("nightRate", 0);
    rates.put("graceMinutes", 0);

    Map<String, Object> region = new LinkedHashMap<>();
    region.put("countryCode", "CO");
    region.put("platePattern", "ABC123");
    region.put("platePrefix", "");

    Map<String, Object> tickets = new LinkedHashMap<>();
    tickets.put("delivery", List.of("PRINT"));
    tickets.put("allowReprint", true);
    tickets.put("showTicketPreview", false);
    tickets.put("printerType", "NONE");
    tickets.put("printerName", "");
    tickets.put("thermalPrinter", false);

    Map<String, Object> shifts = new LinkedHashMap<>();
    shifts.put("enabled", false);

    Map<String, Object> agreements = new LinkedHashMap<>();
    agreements.put("enabled", false);
    agreements.put("discount", 0);

    Map<String, Object> operationConfiguration = new LinkedHashMap<>();
    operationConfiguration.put("defaultVehicleType", "CAR");
    operationConfiguration.put("defaultVisitorType", "VISITOR");
    operationConfiguration.put("enableCustodiedItem", true);
    operationConfiguration.put("showAdvancedSection", false);
    operationConfiguration.put("countryCode", "CO");
    operationConfiguration.put("platePrefix", "");
    operationConfiguration.put("platePattern", "ABC123");

    return Map.ofEntries(
        Map.entry("plan", company.getPlan().name()),
        Map.entry("vehicleTypes", List.of("MOTORCYCLE", "CAR")),
        Map.entry("capacity", capacity),
        Map.entry("rates", rates),
        Map.entry("region", region),
        Map.entry("paymentMethods", List.of("CASH")),
        Map.entry("tickets", tickets),
        Map.entry("shifts", shifts),
        Map.entry("agreements", agreements),
        Map.entry("operationConfiguration", operationConfiguration),
        Map.entry("modules", Map.of(
            "cash", true,
            "shifts", false,
            "clients", false,
            "monthly", false,
            "agreements", false,
            "advancedAudit", true)),
        Map.entry("sites", List.of(Map.of("code", "PRINCIPAL", "name", "Sede principal"))),
        Map.entry("roles", List.of("ADMIN", "OPERADOR")),
        Map.entry("criticalAudit", List.of("COBROS", "ANULACIONES", "CIERRE_CAJA")));
  }

  public Map<String, Object> stepMap(Map<String, Object> progressData, int step) {
    Object raw = progressData.get("step_" + step);
    if (raw instanceof Map<?, ?> map) {
      Map<String, Object> out = new LinkedHashMap<>();
      map.forEach((k, v) -> out.put(String.valueOf(k), v));
      return out;
    }
    return Map.of();
  }

  public String mapVehicleTypeCode(String raw) {
    if (raw == null) return "OTHER";
    return switch (raw.toUpperCase()) {
      case "MOTO", "MOTORCYCLE", "MOTORBIKE" -> "MOTORCYCLE";
      case "CARRO", "CAR", "AUTO", "AUTOMOVIL" -> "CAR";
      case "BICICLETA", "BICYCLE", "BIKE" -> "BICYCLE";
      case "CAMIONETA", "VAN", "SUV", "JEEP" -> "VAN";
      case "CAMION", "TRUCK", "CAMIONETA_CARGA" -> "TRUCK";
      case "BUS", "BUSETA", "MICROBUS" -> "BUS";
      case "ELECTRICO", "ELECTRIC", "EV" -> "ELECTRIC";
      case "OTRO", "OTHER" -> "OTHER";
      default -> "OTHER";
    };
  }

  public String mapPaymentMethodCode(String raw) {
    if (raw == null) return "CASH";
    return switch (raw.toUpperCase()) {
      case "EFECTIVO", "CASH" -> "CASH";
      case "TARJETA_DEBITO", "DEBIT_CARD", "DEBIT" -> "DEBIT_CARD";
      case "TARJETA_CREDITO", "CREDIT_CARD", "CREDIT" -> "CREDIT_CARD";
      case "NEQUI" -> "NEQUI";
      case "DAVIPLATA" -> "DAVIPLATA";
      case "TRANSFERENCIA", "TRANSFER", "WIRE_TRANSFER" -> "TRANSFER";
      case "QR", "QR_CODE" -> "QR";
      case "CONVENIO", "AGREEMENT", "CONTRACT" -> "AGREEMENT";
      case "MIXTO", "MIXED", "SPLIT" -> "MIXED";
      default -> "CASH";
    };
  }

  public int extractSitesCount(Object rawSites) {
    if (!(rawSites instanceof List<?> sites)) return 1;
    return Math.max(1, sites.size());
  }

  public boolean moduleEnabled(Map<String, Object> settings, String key, boolean fallback) {
    Object raw = settings.get("modules");
    if (raw instanceof Map<?, ?> map) {
      Object value = map.get(key);
      if (value instanceof Boolean b) return b;
    }
    return fallback;
  }

  public List<String> asStringList(Object raw, List<String> fallback) {
    if (!(raw instanceof List<?> list)) return fallback;
    List<String> out = list.stream().map(String::valueOf).map(String::trim).filter(s -> !s.isBlank()).toList();
    return out.isEmpty() ? fallback : out;
  }

  private OperationalProfile inferOperationalProfile(Map<String, Object> step1) {
    List<String> rawTypes = asStringList(step1.get("vehicleTypes"), List.of());
    List<String> vehicleTypes = rawTypes.stream().map(this::mapVehicleTypeCode).toList();
    
    boolean hasMoto = vehicleTypes.contains("MOTORCYCLE");
    boolean hasCar = vehicleTypes.contains("CAR");
    boolean hasOthers = vehicleTypes.stream().anyMatch(v -> !v.equals("MOTORCYCLE") && !v.equals("CAR"));
    
    if (hasMoto && !hasCar && !hasOthers) return OperationalProfile.MOTORCYCLE_ONLY;
    if (hasCar && !hasMoto && !hasOthers) return OperationalProfile.CAR_ONLY;
    return OperationalProfile.MIXED;
  }

  private int extractNumber(Object raw, int fallback) {
    if (raw instanceof Number n) return n.intValue();
    if (raw instanceof String s) {
      try {
        return Integer.parseInt(s);
      } catch (NumberFormatException e) {
        return fallback;
      }
    }
    return fallback;
  }

  private Map<String, Object> extractMap(Object raw) {
    if (raw instanceof Map<?, ?> map) {
      Map<String, Object> out = new LinkedHashMap<>();
      map.forEach((k, v) -> out.put(String.valueOf(k), v));
      return out;
    }
    return new LinkedHashMap<>();
  }

  private Map<String, Object> inferModules(Map<String, Object> progressData) {
    boolean shifts = containsYes(progressData.get("step_5"));
    boolean clients = containsYes(progressData.get("step_8"));
    boolean agreements = containsYes(progressData.get("step_9"));
    return Map.of(
        "cash", true,
        "shifts", shifts,
        "clients", clients,
        "monthly", clients,
        "agreements", agreements,
        "advancedAudit", true);
  }

  private boolean containsYes(Object rawStep) {
    if (!(rawStep instanceof Map<?, ?> map)) {
      return false;
    }
    Object v = map.get("enabled");
    if (v instanceof Boolean b) {
      return b;
    }
    return false;
  }
}
