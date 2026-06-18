package com.parkflow.modules.configuration.application.port.in;

import java.util.UUID;

public interface OperationalValidationUseCase {
  void validateEntryPayload(UUID companyId, String vehicleType, String entryMode,
      String lane, String terminal, String cashier);
}
