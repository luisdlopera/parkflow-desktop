package com.parkflow.modules.parking.operation.controller;

import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.application.port.in.RegisterEntryUseCase;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.service.OperationService;
import com.parkflow.modules.parking.operation.service.SupervisorService;
import jakarta.validation.Valid;
import java.time.ZoneId;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/operations")
public class OperationController {
  private final OperationService operationService;
  private final SupervisorService supervisorService;
  private final RegisterEntryUseCase registerEntryUseCase;
  private final RegisterExitUseCase registerExitUseCase;

  public OperationController(
      OperationService operationService,
      SupervisorService supervisorService,
      RegisterEntryUseCase registerEntryUseCase,
      RegisterExitUseCase registerExitUseCase) {
    this.operationService = operationService;
    this.supervisorService = supervisorService;
    this.registerEntryUseCase = registerEntryUseCase;
    this.registerExitUseCase = registerExitUseCase;
  }

  @GetMapping("/supervisor/summary")
  @PreAuthorize("hasAuthority('reportes:leer')")
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
  @PreAuthorize("hasAuthority('tickets:emitir')")
  public OperationResultResponse registerEntry(@Valid @RequestBody EntryRequest request) {
    return registerEntryUseCase.execute(request);
  }

  @PostMapping("/exits")
  @PreAuthorize("hasAuthority('cobros:registrar')")
  public OperationResultResponse registerExit(@Valid @RequestBody ExitRequest request) {
    return registerExitUseCase.execute(request);
  }

  @PostMapping("/tickets/reprint")
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  public OperationResultResponse reprint(@Valid @RequestBody ReprintRequest request) {
    return operationService.reprintTicket(request);
  }

  @PostMapping("/tickets/lost")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  public OperationResultResponse lost(@Valid @RequestBody LostTicketRequest request) {
    return operationService.processLostTicket(request);
  }

  @PostMapping("/tickets/void")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  public OperationResultResponse voidTicket(@Valid @RequestBody VoidRequest request) {
    return operationService.voidSession(request);
  }

  @GetMapping("/sessions/active")
  @PreAuthorize("hasAuthority('tickets:emitir') or hasAuthority('cobros:registrar')")
  public OperationResultResponse active(
      @RequestParam(required = false) String ticketNumber,
      @RequestParam(required = false) String plate,
      @RequestParam(required = false) String agreementCode) {
    return operationService.findActive(ticketNumber, plate, agreementCode);
  }

  @GetMapping("/tickets/{ticketNumber}")
  @PreAuthorize("hasAuthority('tickets:emitir') or hasAuthority('cobros:registrar')")
  public OperationResultResponse getTicket(@PathVariable String ticketNumber) {
    return operationService.getTicket(ticketNumber);
  }

  @GetMapping("/sessions/active-list")
  @PreAuthorize("hasAuthority('reportes:leer') or hasAuthority('tickets:emitir')")
  public List<ReceiptResponse> activeList() {
    return operationService.listActiveSessions();
  }
}
