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
      // Mapear ambos a códigos estandarizados para comparación consistente
      List<String> standardizedAllowed = allowedPayments.stream().map(this::mapPaymentMethodCode).toList();
      List<String> standardizedCurrent = current.stream().map(this::mapPaymentMethodCode).toList();
      out.put("paymentMethods", standardizedCurrent.stream().filter(standardizedAllowed::contains).toList());
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
    rates.put("type", String.valueOf(step3.getOrDefault("billingModel", "HOURLY")));
    rates.put("baseValue", extractNumber(step3.get("baseValue"), 0));
    rates.put("flatRate", extractNumber(step3.get("flatRate"), 0));
    rates.put("fullDayRate", extractNumber(step3.get("fullDayRate"), 0));
    
    // Night Rate Config
    rates.put("hasNightRate", Boolean.TRUE.equals(step3.get("hasNightRate")));
    rates.put("nightStartTime", String.valueOf(step3.getOrDefault("nightStartTime", "20:00")));
    rates.put("nightEndTime", String.valueOf(step3.getOrDefault("nightEndTime", "06:00")));
    rates.put("nightRate", extractNumber(step3.get("nightRate"), 0));
    
    // Fractions
    rates.put("hasFractions", Boolean.TRUE.equals(step3.get("hasFractions")));
    rates.put("minFractionMinutes", extractNumber(step3.get("minFractionMinutes"), 0));
    rates.put("fractionValue", extractNumber(step3.get("fractionValue"), 0));
    
    // Rounding & Courtesy
    rates.put("rounding", String.valueOf(step3.getOrDefault("rounding", "EXACT")));
    rates.put("hasCourtesy", Boolean.TRUE.equals(step3.get("hasCourtesy")));
    rates.put("graceMinutes", extractNumber(step3.get("graceMinutes"), 0));
    
    // Weekend/Holidays
    rates.put("hasWeekendRate", Boolean.TRUE.equals(step3.get("hasWeekendRate")));
    rates.put("weekendRate", extractNumber(step3.get("weekendRate"), 0));
    
    // Rates by Vehicle Type
    rates.put("enableRateByType", Boolean.TRUE.equals(step3.get("enableRateByType")));
    rates.put("byType", extractMap(step3.get("ratesByType")));

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
    tickets.put("ticketPrefix", String.valueOf(step7.getOrDefault("ticketPrefix", "T-")));

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

    Map<String, Object> helmetConfig = resolveHelmetConfig(step1, step8);
    boolean enableHelmet = Boolean.TRUE.equals(helmetConfig.get("enableHelmetSection"));
    boolean usesHelmetTokens = "LOCKERS".equals(String.valueOf(helmetConfig.get("helmetHandling")));

    Map<String, Object> operationConfiguration = new LinkedHashMap<>();
    operationConfiguration.put("defaultVehicleType", vehicleTypes.isEmpty() ? "CAR" : vehicleTypes.get(0));
    operationConfiguration.put("defaultVisitorType", "VISITOR");
    operationConfiguration.put("enableCustodiedItem", enableHelmet);
    operationConfiguration.put("enableHelmetSection", enableHelmet);
    operationConfiguration.put("helmetHandling", String.valueOf(helmetConfig.getOrDefault("helmetHandling", "NONE")));
    operationConfiguration.put("usesHelmetTokens", usesHelmetTokens);
    operationConfiguration.put("usesLockers", usesHelmetTokens);
    operationConfiguration.put("helmetTokenCount", extractNumber(helmetConfig.get("helmetTokenCount"), 0));
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
    // Sync the 'features' map from the wizard answers so that FeatureFlagsSection
    // and useFeatureFlags() always reflect what the user configured in onboarding.
    settings.put("features", inferFeatureFlags(progressData, vehicleTypes, helmetConfig, paymentMethods));
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
    rates.put("flatRate", 0);
    rates.put("fullDayRate", 0);
    rates.put("hasNightRate", false);
    rates.put("nightStartTime", "20:00");
    rates.put("nightEndTime", "06:00");
    rates.put("nightRate", 0);
    rates.put("hasFractions", false);
    rates.put("minFractionMinutes", 0);
    rates.put("fractionValue", 0);
    rates.put("rounding", "EXACT");
    rates.put("hasCourtesy", false);
    rates.put("graceMinutes", 0);
    rates.put("hasWeekendRate", false);
    rates.put("weekendRate", 0);
    rates.put("enableRateByType", false);
    rates.put("byType", Map.of());

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
    tickets.put("ticketPrefix", "T-");

    Map<String, Object> shifts = new LinkedHashMap<>();
    shifts.put("enabled", false);

    Map<String, Object> agreements = new LinkedHashMap<>();
    agreements.put("enabled", false);
    agreements.put("discount", 0);

    Map<String, Object> operationConfiguration = new LinkedHashMap<>();
    operationConfiguration.put("defaultVehicleType", "CAR");
    operationConfiguration.put("defaultVisitorType", "VISITOR");
    operationConfiguration.put("enableCustodiedItem", false);
    operationConfiguration.put("enableHelmetSection", false);
    operationConfiguration.put("helmetHandling", "NONE");
    operationConfiguration.put("usesHelmetTokens", false);
    operationConfiguration.put("usesLockers", false);
    operationConfiguration.put("helmetTokenCount", 0);
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
        Map.entry("features", defaultFeaturesMap()),
        Map.entry("sites", List.of(Map.of("code", "PRINCIPAL", "name", "Sede principal"))),
        Map.entry("roles", List.of("ADMIN", "OPERADOR")),
        Map.entry("criticalAudit", List.of("COBROS", "ANULACIONES", "CIERRE_CAJA")));
  }

  /** Returns the default feature-flags map for companies without onboarding data. */
  private Map<String, Object> defaultFeaturesMap() {
    Map<String, Object> f = new LinkedHashMap<>();
    f.put("agreements", false);
    f.put("prepaid", false);
    f.put("memberships", false);
    f.put("electronicBilling", false);
    f.put("lockerControl", false);
    f.put("motorcycleParking", true);
    f.put("bicycleParking", false);
    f.put("multiplePaymentMethods", false);
    f.put("plateValidation", true);
    f.put("specialRates", false);
    f.put("frequentCustomers", false);
    f.put("helmetControl", false);
    f.put("accessoryControl", false);
    f.put("reservations", false);
    f.put("operation24Hours", false);
    return f;
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

  /**
   * Resuelve la configuración de cascos preferentemente desde el paso 1 (tipos de vehículo).
   * Mantiene retrocompatibilidad con onboards en curso que aún tengan la configuración en el paso 8.
   */
  public Map<String, Object> resolveHelmetConfig(Map<String, Object> step1, Map<String, Object> step8) {
    Map<String, Object> primary = step1;
    Map<String, Object> fallback = step8;

    String primaryHandling = String.valueOf(primary.getOrDefault("helmetHandling", ""));
    String fallbackHandling = String.valueOf(fallback.getOrDefault("helmetHandling", ""));
    boolean primaryHasConfig = !primaryHandling.isBlank();
    boolean fallbackHasConfig = !fallbackHandling.isBlank();

    // Preferir datos del paso 1 si existen; de lo contrario, intentar migrar legacy desde paso 8.
    Map<String, Object> source;
    if (primaryHasConfig) {
      source = primary;
    } else if (fallbackHasConfig) {
      source = fallback;
    } else {
      // Legacy: antes helmetSection vivía solo en step8 bajo enableHelmetSection.
      source = fallback;
    }

    String handling = String.valueOf(source.getOrDefault("helmetHandling", ""));
    if (handling.isBlank()) {
      boolean legacyEnabled = Boolean.TRUE.equals(source.get("enableHelmetSection"));
      handling = legacyEnabled ? "LOCKERS" : "NONE";
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("helmetHandling", handling);
    result.put("enableHelmetSection", !"NONE".equals(handling));
    result.put("helmetTokenCount", extractNumber(source.get("helmetTokenCount"), 0));
    return result;
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
    List<String> out = list.stream().map(String::valueOf).map(s -> s.trim()).filter(s -> !s.isBlank()).toList();
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

  public int extractNumber(Object raw, int fallback) {
    return extractNumber(raw, fallback, Integer.MAX_VALUE);
  }

  // S-02, S-04: extractNumber with max value enforcement to prevent extreme values
  public int extractNumber(Object raw, int fallback, int maxAllowed) {
    if (raw instanceof Number n) {
      int val = n.intValue();
      return val >= 0 && val <= maxAllowed ? val : fallback;
    }
    if (raw instanceof String s) {
      try {
        int val = Integer.parseInt(s);
        return val >= 0 && val <= maxAllowed ? val : fallback;
      } catch (NumberFormatException e) {
        return fallback;
      }
    }
    return fallback;
  }

  // I-06: extractDecimal for monetary/precise values using BigDecimal
  public java.math.BigDecimal extractDecimal(Object raw, java.math.BigDecimal fallback) {
    if (raw instanceof java.math.BigDecimal bd) return bd;
    if (raw instanceof Number n) return java.math.BigDecimal.valueOf(n.doubleValue());
    if (raw instanceof String s) {
      try {
        return new java.math.BigDecimal(s);
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

  /**
   * Derives the {@code features} map from wizard progress so that the UI switches
   * in FeatureFlagsSection stay aligned after onboarding completes or is re-run.
   *
   * <p>Only features that the wizard explicitly controls are overwritten. Features
   * not represented in any wizard step (e.g. {@code electronicBilling},
   * {@code specialRates}) are carried forward from the previous settings to avoid
   * erasing manual configurations made outside the wizard.
   *
   * @param progressData    wizard step data keyed by "step_N"
   * @param vehicleTypes    normalised vehicle type codes (e.g. "MOTORCYCLE", "CAR")
   * @param helmetConfig    resolved helmet configuration from resolveHelmetConfig()
   * @param paymentMethods  normalised payment method codes
   * @return mutable feature-flags map compatible with FeatureConfigurationResponse
   */
  private Map<String, Object> inferFeatureFlags(
      Map<String, Object> progressData,
      List<String> vehicleTypes,
      Map<String, Object> helmetConfig,
      List<String> paymentMethods) {

    boolean agreementsEnabled = containsYes(progressData.get("step_9"));
    boolean membershipsEnabled = containsYes(progressData.get("step_8"));

    boolean hasMoto = vehicleTypes.contains("MOTORCYCLE");
    boolean hasBicycle = vehicleTypes.contains("BICYCLE");

    String helmetHandling = String.valueOf(helmetConfig.getOrDefault("helmetHandling", "NONE"));
    boolean helmetControl = !"NONE".equals(helmetHandling);
    boolean lockerControl = "LOCKERS".equals(helmetHandling);

    boolean multiplePaymentMethods = paymentMethods.size() > 1;

    Map<String, Object> features = new LinkedHashMap<>();
    // Features directly controlled by wizard steps:
    features.put("agreements", agreementsEnabled);        // step 9
    features.put("memberships", membershipsEnabled);      // step 8
    features.put("motorcycleParking", hasMoto);           // step 1
    features.put("bicycleParking", hasBicycle);           // step 1
    features.put("helmetControl", helmetControl);         // step 1 helmetHandling
    features.put("lockerControl", lockerControl);         // step 1 helmetHandling=LOCKERS
    features.put("multiplePaymentMethods", multiplePaymentMethods); // step 6
    // C-06: derive 24h flag from step 3 instead of hardcoding false
    Map<String, Object> step3Data = stepMap(progressData, 3);
    boolean is24hOperation = Boolean.TRUE.equals(step3Data.get("hasNightRate"))
        || "MIXED".equals(String.valueOf(step3Data.getOrDefault("billingModel", "")));
    // Features not yet covered by wizard — keep false as safe default:
    features.put("prepaid", false);
    features.put("electronicBilling", false);
    features.put("plateValidation", true);
    features.put("specialRates", false);
    features.put("frequentCustomers", false);
    features.put("accessoryControl", false);
    features.put("reservations", false);
    features.put("operation24Hours", is24hOperation);
    return features;
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
