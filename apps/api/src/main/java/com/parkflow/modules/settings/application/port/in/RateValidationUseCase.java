package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.settings.infrastructure.persistence.MasterVehicleTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

public interface RateValidationUseCase {
  void validateSchedule(Rate rate);
  void validateMinMax(Rate rate);
  void validateVehicleType(Rate rate, MasterVehicleTypeRepository vehicleTypeRepository);
  void validateOverlap(Rate rate, List<Rate> others);
}
