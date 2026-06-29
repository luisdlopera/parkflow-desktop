package com.parkflow.modules.onboarding.application.service;

import com.parkflow.config.CacheConfig;
import com.parkflow.modules.licensing.domain.CompanyModule;
import com.parkflow.modules.licensing.domain.repository.CompanyModulePort;
import com.parkflow.modules.licensing.enums.ModuleType;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FeatureAccessService {

  private final CompanyModulePort companyModulePort;

  @Cacheable(cacheNames = CacheConfig.PLAN_FEATURES, key = "#plan.name()")
  public Map<String, Object> getAvailableOptionsByPlan(PlanType plan) {
    boolean multiLocation = plan == PlanType.PRO || plan == PlanType.ENTERPRISE;
    boolean advancedPermissions = plan == PlanType.PRO || plan == PlanType.ENTERPRISE;
    boolean premiumPayments = plan != PlanType.LOCAL;
    boolean agreementAndMonthly = plan != PlanType.LOCAL;
    boolean advancedAudit = plan == PlanType.PRO || plan == PlanType.ENTERPRISE;
    boolean multiVehicle = true;
    List<String> allowedPayments = List.of("CASH", "DEBIT_CARD", "CREDIT_CARD", "NEQUI", "DAVIPLATA", "TRANSFER", "QR", "AGREEMENT", "MIXED");
    return Map.of(
        "vehicleTypes", List.of("MOTO", "CARRO", "BICICLETA", "CAMIONETA", "CAMION", "BUS", "OTRO"),
        "paymentMethods", allowedPayments,
        "allowMultipleVehicleTypes", multiVehicle,
        "allowMultiLocation", multiLocation,
        "allowAdvancedPermissions", advancedPermissions,
        "allowPremiumPayments", premiumPayments,
        "allowAgreementsAndMonthly", agreementAndMonthly,
        "allowAdvancedAudit", advancedAudit);
  }

  @Cacheable(cacheNames = CacheConfig.COMPANY_SETTINGS, key = "'modules:' + #companyId")
  public Map<ModuleType, Boolean> getEnabledModulesForCompany(UUID companyId) {
    List<CompanyModule> modules = companyModulePort.findByCompanyIdAndEnabled(companyId, true);
    return modules.stream()
        .filter(m -> m.isActive())
        .collect(java.util.stream.Collectors.toMap(
            m -> m.getModuleType(),
            m -> true,
            (a, b) -> a));
  }

  public boolean isModuleEnabled(UUID companyId, ModuleType moduleType) {
    return companyModulePort.findByCompanyIdAndModuleType(companyId, moduleType)
        .map(m -> m.isActive())
        .orElse(false);
  }

  public boolean isFeatureEnabled(Map<String, Object> settings, String featureKey) {
    Object modules = settings.get("modules");
    if (modules instanceof Map<?, ?> modulesMap) {
      Object value = modulesMap.get(featureKey);
      return value instanceof Boolean b && b;
    }
    return false;
  }
}
