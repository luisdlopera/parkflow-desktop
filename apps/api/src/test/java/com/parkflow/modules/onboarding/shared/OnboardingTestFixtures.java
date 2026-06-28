package com.parkflow.modules.onboarding.shared;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Centralized test fixtures for onboarding module.
 * Provides factory methods for each step's test data.
 * Used across validator, controller, and E2E tests.
 */
public class OnboardingTestFixtures {

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: Vehicle Types
  // ─────────────────────────────────────────────────────────────────────────

  public static Map<String, Object> step1Data(
      List<String> vehicleTypes, String helmetHandling, int helmetTokenCount) {
    var data = new LinkedHashMap<String, Object>();
    if (vehicleTypes != null) data.put("vehicleTypes", vehicleTypes);
    if (helmetHandling != null) data.put("helmetHandling", helmetHandling);
    if (helmetTokenCount > 0) data.put("helmetTokenCount", helmetTokenCount);
    return data;
  }

  public static Map<String, Object> step1DataValid() {
    return step1Data(List.of("CAR"), "NONE", 0);
  }

  public static Map<String, Object> step1DataMotorcycle() {
    return step1Data(List.of("MOTORCYCLE"), "LOCKERS", 50);
  }

  public static Map<String, Object> step1DataEmpty() {
    return step1Data(List.of(), null, 0);
  }

  public static Map<String, Object> step1DataMultiple() {
    return step1Data(List.of("CAR", "MOTORCYCLE", "TRUCK"), "LOCKERS", 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Capacity
  // ─────────────────────────────────────────────────────────────────────────

  public static Map<String, Object> step2Data(
      int totalCapacity, boolean controlSlots, Map<String, Integer> capacityByType) {
    var data = new LinkedHashMap<String, Object>();
    data.put("totalCapacity", totalCapacity);
    data.put("controlSlots", controlSlots);
    if (capacityByType != null && !capacityByType.isEmpty()) {
      data.put("capacityByType", capacityByType);
    }
    return data;
  }

  public static Map<String, Object> step2DataValid() {
    return step2Data(100, false, null);
  }

  public static Map<String, Object> step2DataWithControlSlots() {
    return step2Data(
        100, true, Map.of("CAR", 60, "MOTORCYCLE", 40));
  }

  public static Map<String, Object> step2DataInvalid() {
    return step2Data(0, false, null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3: Rates
  // ─────────────────────────────────────────────────────────────────────────

  public static Map<String, Object> step3DataBasic() {
    return Map.of(
        "billingModel", "HOURLY",
        "baseValue", 2000,
        "graceMinutes", 5);
  }

  public static Map<String, Object> step3DataFlat() {
    return Map.of(
        "billingModel", "FLAT",
        "flatRate", 10000);
  }

  public static Step3Builder step3Builder() {
    return new Step3Builder();
  }

  /**
   * Fluent builder for complex Step 3 (Rates) test scenarios.
   * Example: step3Builder().billingModel("HOURLY").baseValue(3000)
   * .addRateByType("CAR", 3000).addRateByType("MOTO", 1500).build()
   */
  public static class Step3Builder {
    private String billingModel = "HOURLY";
    private int baseValue = 2000;
    private int flatRate = 0;
    private int graceMinutes = 5;
    private Map<String, Integer> ratesByType = new HashMap<>();
    private boolean hasNightRate = false;
    private String nightStartTime = "22:00";
    private String nightEndTime = "06:00";
    private int nightRate = 0;
    private boolean hasFullDayRate = false;
    private int fullDayRate = 0;
    private boolean hasFractions = false;
    private int minFractionMinutes = 15;
    private int fractionValue = 500;
    private boolean hasCourtesy = false;
    private int courtesyMinutes = 5;
    private String rounding = "EXACT";
    private boolean enableRateByType = false;

    public Step3Builder billingModel(String model) {
      this.billingModel = model;
      return this;
    }

    public Step3Builder baseValue(int value) {
      this.baseValue = value;
      return this;
    }

    public Step3Builder flatRate(int value) {
      this.flatRate = value;
      return this;
    }

    public Step3Builder graceMinutes(int minutes) {
      this.graceMinutes = minutes;
      return this;
    }

    public Step3Builder addRateByType(String type, int rate) {
      this.ratesByType.put(type, rate);
      this.enableRateByType = true;
      return this;
    }

    public Step3Builder withNightRate(String start, String end, int rate) {
      this.hasNightRate = true;
      this.nightStartTime = start;
      this.nightEndTime = end;
      this.nightRate = rate;
      return this;
    }

    public Step3Builder withFullDayRate(int rate) {
      this.hasFullDayRate = true;
      this.fullDayRate = rate;
      return this;
    }

    public Step3Builder withFractions(int minMinutes, int fractionValue) {
      this.hasFractions = true;
      this.minFractionMinutes = minMinutes;
      this.fractionValue = fractionValue;
      return this;
    }

    public Step3Builder withCourtesy(int minutes) {
      this.hasCourtesy = true;
      this.courtesyMinutes = minutes;
      return this;
    }

    public Step3Builder rounding(String mode) {
      this.rounding = mode;
      return this;
    }

    public Map<String, Object> build() {
      var data = new LinkedHashMap<String, Object>();
      data.put("billingModel", billingModel);

      // Conditional fields based on billing model
      if ("HOURLY".equals(billingModel) || "MIXED".equals(billingModel)
          || "FRACTION".equals(billingModel)) {
        data.put("baseValue", baseValue);
      }
      if ("FLAT".equals(billingModel) || "FULL_DAY".equals(billingModel)) {
        data.put("flatRate", flatRate > 0 ? flatRate : baseValue);
      }

      data.put("graceMinutes", graceMinutes);

      if (!ratesByType.isEmpty()) {
        data.put("ratesByType", new HashMap<>(ratesByType));
      }
      data.put("enableRateByType", enableRateByType);

      data.put("hasNightRate", hasNightRate);
      if (hasNightRate) {
        data.put("nightStartTime", nightStartTime);
        data.put("nightEndTime", nightEndTime);
        data.put("nightRate", nightRate);
      }

      data.put("hasFullDayRate", hasFullDayRate);
      if (hasFullDayRate) {
        data.put("fullDayRate", fullDayRate);
      }

      data.put("hasFractions", hasFractions);
      if (hasFractions) {
        data.put("minFractionMinutes", minFractionMinutes);
        data.put("fractionValue", fractionValue);
      }

      data.put("hasCourtesy", hasCourtesy);
      if (hasCourtesy) {
        data.put("graceMinutes", courtesyMinutes);
      }

      data.put("rounding", rounding);

      return data;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────

  public static UUID randomCompanyId() {
    return UUID.randomUUID();
  }

  public static Map<String, Object> buildProgressData(
      Map<String, Object> step1,
      Map<String, Object> step2,
      Map<String, Object> step3) {
    var progress = new LinkedHashMap<String, Object>();
    if (step1 != null) progress.put("step_1", step1);
    if (step2 != null) progress.put("step_2", step2);
    if (step3 != null) progress.put("step_3", step3);
    return progress;
  }
}
