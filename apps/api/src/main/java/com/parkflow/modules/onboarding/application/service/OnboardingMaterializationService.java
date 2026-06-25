package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.configuration.domain.repository.PaymentMethodPort;
import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.infrastructure.persistence.RateRepository;
import com.parkflow.modules.licensing.domain.Company;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingMaterializationService {

  private final OnboardingMaterializationPort materializationPort;
  private final PaymentMethodPort paymentMethodPort;
  private final RateRepository rateRepository;
  private final OnboardingSettingsMapper settingsMapper;

  @Transactional
  public void materializeVehicleTypes(UUID companyId, List<String> codes) {
    materializationPort.addVehicleTypesToCompany(companyId, codes);
  }

  @Transactional
  public void materializePaymentMethods(UUID companyId, List<String> codes) {
    for (String code : codes) {
      if (paymentMethodPort.existsByCodeAndCompany(code, companyId)) continue;
      PaymentMethod global = paymentMethodPort.findByCode(code).orElse(null);
      PaymentMethod pm = new PaymentMethod();
      pm.setCompanyId(companyId);
      pm.setCode(code);
      pm.setName(global != null ? global.getName() : code);
      pm.setRequiresReference(global != null && global.isRequiresReference());
      pm.setActive(true);
      pm.setDisplayOrder(global != null ? global.getDisplayOrder() : 99);
      paymentMethodPort.save(pm);
    }
  }

  @Transactional
  public void createRatesFromOnboarding(Company company, Map<String, Object> progressData) {
    Map<String, Object> step1 = settingsMapper.stepMap(progressData, 1);
    Map<String, Object> step3 = settingsMapper.stepMap(progressData, 3);

    List<String> vehicleTypes = settingsMapper.asStringList(step1.get("vehicleTypes"), List.of("MOTORCYCLE", "CAR"));
    int baseValue = settingsMapper.extractNumber(step3.get("baseValue"), 2000);
    int graceMinutes = settingsMapper.extractNumber(step3.get("graceMinutes"), 5);

    Map<String, Object> ratesByType = new LinkedHashMap<>();
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

  public void createLockersIfConfigured(UUID companyId, Map<String, Object> step1) {
    if (step1 == null) return;
    String handling = String.valueOf(step1.getOrDefault("helmetHandling", ""));
    if (!"LOCKERS".equals(handling)) return;
    int count = settingsMapper.extractNumber(step1.get("helmetTokenCount"), 0);
    if (count <= 0 || count > 9999) return;
    materializationPort.createLockersForCompany(companyId, new BatchLockerRequest("L-", 1, count));
  }

  public void resizeCapacity(UUID companyId, int totalCapacity) {
    if (totalCapacity > 0) {
      materializationPort.resizeCapacityForCompany(companyId, totalCapacity);
    }
  }

  private void deactivateExistingRates(Company company) {
    List<Rate> existing = rateRepository.findByCompanyId(company.getId());
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
