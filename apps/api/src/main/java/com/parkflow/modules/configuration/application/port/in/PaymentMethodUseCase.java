package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.dto.PaymentMethodResponse;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PaymentMethodUseCase {
  SettingsPageResponse<PaymentMethodResponse> list(String q, Boolean active, UUID companyId, Pageable pageable);
  PaymentMethodResponse get(UUID id);
  PaymentMethodResponse create(PaymentMethodRequest request, UUID companyId);
  PaymentMethodResponse update(UUID id, PaymentMethodRequest request, UUID companyId);
  PaymentMethodResponse patchStatus(UUID id, boolean active, UUID companyId);
}
