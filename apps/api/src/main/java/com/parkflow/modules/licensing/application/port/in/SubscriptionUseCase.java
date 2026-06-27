package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.Plan;
import com.parkflow.modules.licensing.domain.Subscription;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.PlanRepository;
import com.parkflow.modules.licensing.domain.repository.SubscriptionPort;
import com.parkflow.modules.licensing.dto.CreateSubscriptionRequest;
import com.parkflow.modules.licensing.dto.SubscriptionResponse;
import com.parkflow.modules.licensing.enums.SubscriptionStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface SubscriptionUseCase {
  List<SubscriptionResponse> listByCompany(UUID companyId);
  SubscriptionResponse getActive(UUID companyId);
  SubscriptionResponse create(UUID companyId, CreateSubscriptionRequest request);
  SubscriptionResponse cancel(UUID companyId, UUID subscriptionId);
  SubscriptionResponse suspend(UUID companyId, UUID subscriptionId);
}
