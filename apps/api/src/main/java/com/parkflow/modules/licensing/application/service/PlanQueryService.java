package com.parkflow.modules.licensing.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Plan;
import com.parkflow.modules.licensing.domain.repository.PlanRepository;
import com.parkflow.modules.licensing.dto.PlanResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.parkflow.config.CacheConfig.PLANS_LIST;

/**
 * Handles plan query operations: list, get.
 * Max 3 methods (read-only queries).
 */
@Service
@RequiredArgsConstructor
public class PlanQueryService {

  private static final String DEFAULT_FEATURES_JSON = "{}";

  private final PlanRepository planRepository;
  private final ObjectMapper objectMapper;

  @Cacheable(value = PLANS_LIST, key = "#includeDeleted + ':' + #active")
  @Transactional(readOnly = true)
  public List<PlanResponse> listPlans(boolean includeDeleted, Boolean active) {
    List<Plan> plans;
    if (includeDeleted) {
      if (active != null) {
        plans = planRepository.findAllByIsActive(active);
      } else {
        plans = planRepository.findAllByOrderByCreatedAtDesc();
      }
    } else {
      if (active != null) {
        plans = planRepository.findAllActiveByDeletedAtIsNull(active);
      } else {
        plans = planRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
      }
    }
    return plans.stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public PlanResponse getPlan(UUID id) {
    return toResponse(findById(id));
  }

  private Plan findById(UUID id) {
    return planRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND",
            "Plan no encontrado"));
  }

  PlanResponse toResponse(Plan plan) {
    return new PlanResponse(
        plan.getId(),
        plan.getCode(),
        plan.getName(),
        plan.getDescription(),
        plan.getMonthlyPrice(),
        plan.getYearlyPrice(),
        plan.isActive(),
        deserializeFeaturesAsMap(plan.getFeatures()),
        plan.getCreatedAt(),
        plan.getUpdatedAt(),
        plan.getDeletedAt());
  }

  private Map<String, Boolean> deserializeFeaturesAsMap(String json) {
    if (json == null || json.isBlank() || DEFAULT_FEATURES_JSON.equals(json)) {
      return new HashMap<>();
    }
    try {
      return objectMapper.readValue(json, new TypeReference<Map<String, Boolean>>() {});
    } catch (JsonProcessingException e) {
      return new HashMap<>();
    }
  }
}
