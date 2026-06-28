package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.CreateSubscriptionRequest;
import com.parkflow.modules.licensing.dto.SubscriptionResponse;
import java.util.List;
import java.util.UUID;


public interface SubscriptionUseCase {
  List<SubscriptionResponse> listByCompany(UUID companyId);
  SubscriptionResponse getActive(UUID companyId);
  SubscriptionResponse create(UUID companyId, CreateSubscriptionRequest request);
  SubscriptionResponse cancel(UUID companyId, UUID subscriptionId);
  SubscriptionResponse suspend(UUID companyId, UUID subscriptionId);
}
