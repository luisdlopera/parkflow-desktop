package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class VehicleTypeMapper {

  public List<String> mapVehicleTypes(Map<String, Object> step1, OperationalProfile profile) {
    if (profile == OperationalProfile.MOTORCYCLE_ONLY) {
      return List.of("MOTORCYCLE");
    } else if (profile == OperationalProfile.CAR_ONLY) {
      return List.of("CAR");
    } else {
      List<String> rawTypes = asStringList(step1.get("vehicleTypes"), List.of("MOTORCYCLE", "CAR"));
      return rawTypes.stream().map(this::mapCode).toList();
    }
  }

  private String mapCode(String code) {
    return switch (code) {
      case "MOTO", "MOTOCICLETA" -> "MOTORCYCLE";
      case "CARRO", "AUTO", "AUTOMÓVIL" -> "CAR";
      case "MOTORCYCLE", "CAR" -> code;
      default -> "CAR";
    };
  }

  private List<String> asStringList(Object value, List<String> defaultValue) {
    if (value instanceof List<?> list) {
      return list.stream().map(String::valueOf).toList();
    }
    return defaultValue;
  }
}
