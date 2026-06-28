package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.PlanRequest;
import com.parkflow.modules.licensing.dto.PlanResponse;
import java.util.UUID;


public interface PlanLifecycleUseCase {
  PlanResponse createPlan(PlanRequest request);
  PlanResponse updatePlan(UUID id, PlanRequest request);
  void deletePlan(UUID id);
  PlanResponse togglePlan(UUID id);
  PlanResponse duplicatePlan(UUID id);
}
