package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.infrastructure.persistence.RateRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Onboarding Rate Initialization - handles creation of default and configured rates during onboarding.
 * Initializes parking rates for a newly onboarded company.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingRateInitializationService {

  private final RateRepository rateRepository;
  private final OnboardingSettingsMapper settingsMapper;

  @Transactional
  public void createRatesFromOnboarding(Company company, Map<String, Object> progressData) {
    Map<String, Object> step1 = settingsMapper.stepMap(progressData, 1);
    Map<String, Object> step3 = settingsMapper.stepMap(progressData, 3);

    List<String> vehicleTypes = settingsMapper.asStringList(step1.get("vehicleTypes"), List.of("MOTORCYCLE", "CAR"));
    int baseValue = settingsMapper.extractNumber(step3.get("baseValue"), 2000);
    int graceMinutes = settingsMapper.extractNumber(step3.get("graceMinutes"), 5);

    Map<String, Object> ratesByType = new java.util.LinkedHashMap<>();
    Object rawByType = step3.get("ratesByType");
    if (rawByType instanceof Map<?, ?> map) {
      map.forEach((k, v) -> ratesByType.put(String.valueOf(k), v));
    }

    deactivateExistingRates(company);
    for (String vehicleType : vehicleTypes) {
      int amount = settingsMapper.extractNumber(ratesByType.get(vehicleType), baseValue);
      rateRepository.save(buildRate(company.getId(), vehicleType, amount, graceMinutes));
    }
  }

  @Transactional
  public void createDefaultRates(Company company) {
    deactivateExistingRates(company);
    for (String vehicleType : List.of("MOTORCYCLE", "CAR")) {
      int amount = "MOTORCYCLE".equals(vehicleType) ? 1000 : 2000;
      rateRepository.save(buildRate(company.getId(), vehicleType, amount, 5));
    }
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private void deactivateExistingRates(Company company) {
    List<Rate> existing = rateRepository.findByCompanyId(company.getId());
    for (Rate r : existing) {
      r.setActive(false);
      r.setUpdatedAt(OffsetDateTime.now());
      rateRepository.save(r);
    }
  }

  private Rate buildRate(java.util.UUID companyId, String vehicleType, int amount, int graceMinutes) {
    Rate rate = new Rate();
    rate.setCompanyId(companyId);
    rate.setName("Tarifa " + vehicleType);
    rate.setVehicleType(vehicleType);
    rate.setRateType(RateType.HOURLY);
    rate.setAmount(BigDecimal.valueOf(amount));
    rate.setGraceMinutes(graceMinutes);
    rate.setFractionMinutes(60);
    // Site field removed - use siteRef instead
    rate.setBaseValue(BigDecimal.ZERO);
    rate.setBaseMinutes(0);
    rate.setAdditionalValue(BigDecimal.ZERO);
    rate.setAdditionalMinutes(0);
    rate.setRoundingMode(RoundingMode.NEAREST);
    rate.setLostTicketSurcharge(BigDecimal.ZERO);
    rate.setActive(true);
    rate.setCreatedAt(OffsetDateTime.now());
    rate.setUpdatedAt(OffsetDateTime.now());
    return rate;
  }
}
