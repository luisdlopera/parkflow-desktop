package com.parkflow.modules.tickets.application.port.in;

import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.dto.PrintJobResponse;
import com.parkflow.modules.tickets.dto.RetryPrintJobRequest;
import com.parkflow.modules.tickets.dto.UpdatePrintJobStatusRequest;
import java.util.List;
import java.util.UUID;

public interface TicketPrintUseCase {
    PrintJobResponse create(CreatePrintJobRequest request);
    PrintJobResponse updateStatus(UUID id, UpdatePrintJobStatusRequest request);
    PrintJobResponse retry(UUID id, RetryPrintJobRequest request);
    PrintJobResponse get(UUID id);
    List<PrintJobResponse> listByTicket(String ticketNumber);
    List<PrintJobResponse> listBySession(UUID sessionId);
}
