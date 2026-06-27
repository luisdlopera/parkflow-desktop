package com.parkflow.modules.licensing.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Plan;
import com.parkflow.modules.licensing.domain.repository.PlanRepository;
import com.parkflow.modules.licensing.dto.PlanRequest;
import com.parkflow.modules.licensing.dto.PlanResponse;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.parkflow.config.CacheConfig.PLANS_LIST;

/**
 * Handles plan lifecycle operations: create, update, delete, toggle.
 * Max 4 methods as per hexagonal architecture.
 */
@Service
@RequiredArgsConstructor
public class PlanLifecycleService {

  private static final String DEFAULT_FEATURES_JSON = "{}";
  private static final String PLAN_CODE_PREFIX = "PLAN_";

  private final PlanRepository planRepository;
  private final ObjectMapper objectMapper;

  @CacheEvict(value = PLANS_LIST, allEntries = true)
  @Transactional
  public PlanResponse createPlan(PlanRequest request) {
    String code = generateCode(request.name());
    if (planRepository.existsByCode(code)) {
      throw new OperationException(HttpStatus.CONFLICT, "PLAN_CODE_EXISTS",
          "Ya existe un plan con el código generado: " + code);
    }

    Plan plan = new Plan();
    plan.setCode(code);
    plan.setName(request.name().trim());
    plan.setDescription(request.description() != null ? request.description().trim() : null);
    plan.setMonthlyPrice(request.monthlyPrice());
    plan.setYearlyPrice(request.yearlyPrice());
    plan.setActive(request.isActive());
    plan.setFeatures(serializeFeatures(request.features()));

    plan = planRepository.save(plan);
    return toResponse(plan);
  }

  @CacheEvict(value = PLANS_LIST, allEntries = true)
  @Transactional
  public PlanResponse updatePlan(UUID id, PlanRequest request) {
    Plan plan = findById(id);

    plan.setName(request.name().trim());
    plan.setDescription(request.description() != null ? request.description().trim() : null);
    plan.setMonthlyPrice(request.monthlyPrice());
    plan.setYearlyPrice(request.yearlyPrice());
    plan.setActive(request.isActive());
    plan.setFeatures(serializeFeatures(request.features()));

    plan = planRepository.save(plan);
    return toResponse(plan);
  }

  @CacheEvict(value = PLANS_LIST, allEntries = true)
  @Transactional
  public void deletePlan(UUID id) {
    Plan plan = findById(id);
    if (plan.getDeletedAt() != null) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "PLAN_ALREADY_DELETED",
          "El plan ya fue eliminado");
    }
    ensureAtLeastOneActivePlanRemains(id);
    plan.setDeletedAt(OffsetDateTime.now());
    planRepository.save(plan);
  }

  @CacheEvict(value = PLANS_LIST, allEntries = true)
  @Transactional
  public PlanResponse togglePlan(UUID id) {
    Plan plan = findById(id);

    if (plan.isActive()) {
      ensureAtLeastOneActivePlanRemains(id);
    }

    plan.setActive(!plan.isActive());
    plan = planRepository.save(plan);
    return toResponse(plan);
  }

  @Transactional
  public PlanResponse duplicatePlan(UUID id) {
    Plan source = findById(id);

    String newName = source.getName() + " (copia)";
    String newCode = generateCode(newName);

    Plan clone = new Plan();
    clone.setCode(newCode);
    clone.setName(newName);
    clone.setDescription(source.getDescription());
    clone.setMonthlyPrice(source.getMonthlyPrice());
    clone.setYearlyPrice(source.getYearlyPrice());
    clone.setActive(false);
    clone.setFeatures(source.getFeatures());

    clone = planRepository.save(clone);
    return toResponse(clone);
  }

  private Plan findById(UUID id) {
    return planRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND",
            "Plan no encontrado"));
  }

  private void ensureAtLeastOneActivePlanRemains(UUID excludingId) {
    long activeCount = planRepository.countByIsActiveTrueAndDeletedAtIsNull();
    boolean currentIsActive = planRepository.findById(excludingId)
        .map(p -> p.isActive())
        .orElse(false);
    if (currentIsActive && activeCount <= 1) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "LAST_ACTIVE_PLAN",
          "Debe existir al menos un plan activo en el sistema");
    }
  }

  private String generateCode(String name) {
    String base = name.trim().toUpperCase()
        .replaceAll("[^A-ZÁÉÍÓÚÑ0-9\\s]", "")
        .replaceAll("\\s+", "_");
    if (base.length() > 30) {
      base = base.substring(0, 30);
    }
    return PLAN_CODE_PREFIX + base;
  }

  private String serializeFeatures(Map<String, Boolean> features) {
    if (features == null || features.isEmpty()) {
      return DEFAULT_FEATURES_JSON;
    }
    try {
      return objectMapper.writeValueAsString(features);
    } catch (JsonProcessingException e) {
      throw new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "FEATURES_SERIALIZE_ERROR",
          "Error al serializar features del plan");
    }
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
        deserializeFeatures(plan.getFeatures()),
        plan.getCreatedAt(),
        plan.getUpdatedAt(),
        plan.getDeletedAt());
  }

  private java.util.Map<String, Boolean> deserializeFeatures(String json) {
    if (json == null || json.isBlank() || DEFAULT_FEATURES_JSON.equals(json)) {
      return new java.util.HashMap<>();
    }
    try {
      return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Boolean>>() {});
    } catch (JsonProcessingException e) {
      return new java.util.HashMap<>();
    }
  }
}
