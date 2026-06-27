package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.infrastructure.persistence.RateRepository;
import com.parkflow.modules.configuration.domain.RoundingMode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RateMaterializer {

  private final RateRepository rateRepository;
  private final OnboardingSettingsMapper settingsMapper;

  @Transactional
  public void materializeFromOnboarding(Company company, Map<String, Object> progressData) {
    Map<String, Object> step1 = settingsMapper.stepMap(progressData, 1);
    Map<String, Object> step3 = settingsMapper.stepMap(progressData, 3);

    List<String> vehicleTypes = settingsMapper.asStringList(step1.get("vehicleTypes"), List.of("MOTORCYCLE", "CAR"));
    int baseValue = extractNumber(step3.get("baseValue"), 2000);
    int graceMinutes = extractNumber(step3.get("graceMinutes"), 5);

    Map<String, Object> ratesByType = extractRatesByType(step3);

    deactivateExistingRates(company.getId());
    for (String vehicleType : vehicleTypes) {
      int amount = extractNumber(ratesByType.get(vehicleType), baseValue);
      rateRepository.save(buildRate(company.getId(), vehicleType, amount, graceMinutes));
    }
  }

  @Transactional
  public void materializeDefaults(Company company) {
    deactivateExistingRates(company.getId());
    for (String vehicleType : List.of("MOTORCYCLE", "CAR")) {
      int amount = "MOTORCYCLE".equals(vehicleType) ? 1000 : 2000;
      rateRepository.save(buildRate(company.getId(), vehicleType, amount, 5));
    }
  }

  private void deactivateExistingRates(UUID companyId) {
    List<Rate> existing = rateRepository.findByCompanyId(companyId);
    for (Rate r : existing) {
      r.setActive(false);
      r.setUpdatedAt(OffsetDateTime.now());
      rateRepository.save(r);
    }
  }

  private Rate buildRate(UUID companyId, String vehicleType, int amount, int graceMinutes) {
    Rate rate = new Rate();
    rate.setCompanyId(companyId);
    rate.setName("Tarifa " + vehicleType);
    rate.setVehicleType(vehicleType);
    rate.setRateType(RateType.HOURLY);
    rate.setAmount(BigDecimal.valueOf(amount));
    rate.setGraceMinutes(graceMinutes);
    rate.setFractionMinutes(60);
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

  private Map<String, Object> extractRatesByType(Map<String, Object> step3) {
    Map<String, Object> ratesByType = new LinkedHashMap<>();
    Object rawByType = step3.get("ratesByType");
    if (rawByType instanceof Map<?, ?> map) {
      map.forEach((k, v) -> ratesByType.put(String.valueOf(k), v));
    }
    return ratesByType;
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
}
