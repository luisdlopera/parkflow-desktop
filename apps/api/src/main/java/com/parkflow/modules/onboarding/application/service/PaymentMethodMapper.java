package com.parkflow.modules.onboarding.application.service;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PaymentMethodMapper {

  public List<String> mapPaymentMethods(Map<String, Object> step6, Map<String, Object> allowedAccess) {
    List<String> allowedPayments = asStringList(allowedAccess.get("paymentMethods"), List.of("EFECTIVO"));
    List<String> current = asStringList(step6.get("paymentMethods"), List.of("EFECTIVO"));

    List<String> standardizedAllowed = allowedPayments.stream().map(this::mapCode).toList();
    List<String> standardizedCurrent = current.stream().map(this::mapCode).toList();

    return standardizedCurrent.stream().filter(standardizedAllowed::contains).toList();
  }

  private String mapCode(String code) {
    return switch (code) {
      case "EFECTIVO", "CASH" -> "EFECTIVO";
      case "TARJETA", "CARD", "CREDIT" -> "TARJETA";
      case "TRANSFERENCIA", "TRANSFER", "BANK" -> "TRANSFERENCIA";
      case "CHEQUE", "CHECK" -> "CHEQUE";
      default -> "EFECTIVO";
    };
  }

  private List<String> asStringList(Object value, List<String> defaultValue) {
    if (value instanceof List<?> list) {
      return list.stream().map(String::valueOf).toList();
    }
    return defaultValue;
  }
}
