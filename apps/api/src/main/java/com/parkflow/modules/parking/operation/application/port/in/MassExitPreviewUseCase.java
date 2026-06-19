package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.MassExitFilterRequest;
import com.parkflow.modules.parking.operation.dto.MassExitPreviewResponse;

public interface MassExitPreviewUseCase {
  MassExitPreviewResponse preview(MassExitFilterRequest request);
}
