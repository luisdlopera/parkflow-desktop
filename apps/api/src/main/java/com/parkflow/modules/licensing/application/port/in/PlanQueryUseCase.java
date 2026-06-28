package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.PlanResponse;
import java.util.List;
import java.util.UUID;


public interface PlanQueryUseCase {
  List<PlanResponse> listPlans(boolean includeDeleted, Boolean active);
  PlanResponse getPlan(UUID id);
}
