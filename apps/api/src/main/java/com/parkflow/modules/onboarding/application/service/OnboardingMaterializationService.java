package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.configuration.application.port.out.PaymentMethodPort;
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

/**
 * Materialization facade: composes specialized materializers for different entity types.
 * To be removed in 2.2.0: call materializer services directly instead of using this facade.
 *
 * @deprecated Use {@link VehicleTypeMaterializer}, {@link PaymentMethodMaterializer},
 *             {@link RateMaterializer}, {@link CapacityMaterializer} directly.
 */
@Deprecated(since = "2.1", forRemoval = true)
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingMaterializationService {

  private final VehicleTypeMaterializer vehicleTypeMaterializer;
  private final PaymentMethodMaterializer paymentMethodMaterializer;
  private final RateMaterializer rateMaterializer;
  private final CapacityMaterializer capacityMaterializer;

  @Transactional
  public void materializeVehicleTypes(UUID companyId, List<String> codes) {
    vehicleTypeMaterializer.materialize(companyId, codes);
  }

  @Transactional
  public void materializePaymentMethods(UUID companyId, List<String> codes) {
    paymentMethodMaterializer.materialize(companyId, codes);
  }

  @Transactional
  public void createRatesFromOnboarding(Company company, Map<String, Object> progressData) {
    rateMaterializer.materializeFromOnboarding(company, progressData);
  }

  @Transactional
  public void createDefaultRates(Company company) {
    rateMaterializer.materializeDefaults(company);
  }

  @Transactional
  public void createLockersIfConfigured(UUID companyId, Map<String, Object> step1) {
    capacityMaterializer.createLockersIfConfigured(companyId, step1);
  }

  @Transactional
  public void resizeCapacity(UUID companyId, int totalCapacity) {
    capacityMaterializer.resizeCapacity(companyId, totalCapacity);
  }
}
