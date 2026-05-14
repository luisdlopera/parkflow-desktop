package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.dto.PaymentMethodResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Port for managing payment methods.
 */
public interface PaymentMethodUseCase {
  SettingsPageResponse<PaymentMethodResponse> list(String q, Boolean active, Pageable pageable);
  PaymentMethodResponse get(UUID id);
  PaymentMethodResponse create(PaymentMethodRequest request);
  PaymentMethodResponse update(UUID id, PaymentMethodRequest request);
  PaymentMethodResponse patchStatus(UUID id, boolean active);
}
