package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.OperationalHealthResponse;


public interface OperationalHealthUseCase {
  OperationalHealthResponse getOperationalHealth();
}
