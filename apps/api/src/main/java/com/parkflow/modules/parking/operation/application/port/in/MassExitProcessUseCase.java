package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.MassExitFilterRequest;
import com.parkflow.modules.parking.operation.dto.MassExitResponse;

public interface MassExitProcessUseCase {
  MassExitResponse process(MassExitFilterRequest request);
}
