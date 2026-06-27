package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.tickets.domain.PrintDocumentType;

public interface OperationPrintUseCase {
  void enqueuePrintJob(ParkingSession session, AppUser operator, PrintDocumentType documentType, String reasonSuffix);
}
