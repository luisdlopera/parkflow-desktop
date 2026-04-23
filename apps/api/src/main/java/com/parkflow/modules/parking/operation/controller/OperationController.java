package com.parkflow.modules.parking.operation.controller;

import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.service.OperationService;
import com.parkflow.modules.parking.operation.service.SupervisorService;
import jakarta.validation.Valid;
import java.time.ZoneId;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/operations")
public class OperationController {
  private final OperationService operationService;
  private final SupervisorService supervisorService;

  public OperationController(
      OperationService operationService, SupervisorService supervisorService) {
    this.operationService = operationService;
    this.supervisorService = supervisorService;
  }

  @GetMapping("/supervisor/summary")
  public OperationsSummaryResponse supervisorSummary(
      @RequestParam(name = "timeZone", required = false) String timeZone) {
    ZoneId zone =
        (timeZone != null && !timeZone.isBlank())
            ? ZoneId.of(timeZone)
            : ZoneId.of("America/Bogota");
    return supervisorService.buildSummary(zone);
  }

  @PostMapping("/entries")
  @ResponseStatus(HttpStatus.CREATED)
  public OperationResultResponse registerEntry(@Valid @RequestBody EntryRequest request) {
    return operationService.registerEntry(request);
  }

  @PostMapping("/exits")
  public OperationResultResponse registerExit(@Valid @RequestBody ExitRequest request) {
    return operationService.registerExit(request);
  }

  @PostMapping("/tickets/reprint")
  public OperationResultResponse reprint(@Valid @RequestBody ReprintRequest request) {
    return operationService.reprintTicket(request);
  }

  @PostMapping("/tickets/lost")
  public OperationResultResponse lost(@Valid @RequestBody LostTicketRequest request) {
    return operationService.processLostTicket(request);
  }

  @GetMapping("/sessions/active")
  public OperationResultResponse active(
      @RequestParam(required = false) String ticketNumber,
      @RequestParam(required = false) String plate) {
    return operationService.findActive(ticketNumber, plate);
  }

  @GetMapping("/tickets/{ticketNumber}")
  public OperationResultResponse getTicket(@PathVariable String ticketNumber) {
    return operationService.getTicket(ticketNumber);
  }

  @GetMapping("/sessions/active-list")
  public List<ReceiptResponse> activeList() {
    return operationService.listActiveSessions();
  }
}
