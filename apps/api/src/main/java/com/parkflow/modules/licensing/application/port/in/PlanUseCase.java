package com.parkflow.modules.licensing.application.port.in;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Plan;
import com.parkflow.modules.licensing.domain.repository.PlanRepository;
import com.parkflow.modules.licensing.dto.PlanRequest;
import com.parkflow.modules.licensing.dto.PlanResponse;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.parkflow.config.CacheConfig.PLANS_LIST;

public interface PlanUseCase {
  List<PlanResponse> listPlans(boolean includeDeleted, Boolean active);
  PlanResponse getPlan(UUID id);
  PlanResponse createPlan(PlanRequest request);
  PlanResponse updatePlan(UUID id, PlanRequest request);
  void deletePlan(UUID id);
  PlanResponse togglePlan(UUID id);
  PlanResponse duplicatePlan(UUID id);
}
