package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.repository.PaymentMethodPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentMethodMaterializer {

  private final PaymentMethodPort paymentMethodPort;

  @Transactional
  public void materialize(UUID companyId, List<String> paymentMethodCodes) {
    if (paymentMethodCodes == null || paymentMethodCodes.isEmpty()) return;

    for (String code : paymentMethodCodes) {
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
}
