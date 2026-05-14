package com.parkflow.modules.onboarding.service;

import com.parkflow.modules.licensing.enums.PlanType;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class FeatureAccessService {

  public Map<String, Object> getAvailableOptionsByPlan(PlanType plan) {
    boolean multiLocation = plan == PlanType.PRO || plan == PlanType.ENTERPRISE;
    boolean advancedPermissions = plan == PlanType.PRO || plan == PlanType.ENTERPRISE;
    boolean premiumPayments = plan != PlanType.LOCAL;
    boolean agreementAndMonthly = plan != PlanType.LOCAL;
    boolean advancedAudit = plan == PlanType.PRO || plan == PlanType.ENTERPRISE;
    boolean multiVehicle = true;
    List<String> allowedPayments = plan == PlanType.LOCAL
        ? List.of("EFECTIVO")
        : List.of("EFECTIVO", "TARJETA_DEBITO", "TARJETA_CREDITO", "NEQUI", "DAVIPLATA", "TRANSFERENCIA", "QR", "CONVENIO", "MIXTO");
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

  public boolean isFeatureEnabled(Map<String, Object> settings, String featureKey) {
    Object modules = settings.get("modules");
    if (modules instanceof Map<?, ?> modulesMap) {
      Object value = modulesMap.get(featureKey);
      return value instanceof Boolean b && b;
    }
    return false;
  }
}
