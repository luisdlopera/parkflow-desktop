package com.parkflow.modules.parking.operation.controller;

import com.parkflow.modules.common.debug.AgentDebugNdjson;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.application.port.in.*;
import com.parkflow.modules.parking.operation.application.service.SupervisorService;
import jakarta.validation.Valid;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/operations")
public class OperationController {
  private final SupervisorService supervisorService;
  private final RegisterEntryUseCase registerEntryUseCase;
  private final RegisterExitUseCase registerExitUseCase;
  private final ReprintTicketUseCase reprintTicketUseCase;
  private final ProcessLostTicketUseCase processLostTicketUseCase;
  private final VoidSessionUseCase voidSessionUseCase;
  private final GetTicketUseCase getTicketUseCase;
  private final ListActiveSessionsUseCase listActiveSessionsUseCase;
  private final FindActiveSessionUseCase findActiveSessionUseCase;

  public OperationController(
      SupervisorService supervisorService,
      RegisterEntryUseCase registerEntryUseCase,
      RegisterExitUseCase registerExitUseCase,
      ReprintTicketUseCase reprintTicketUseCase,
      ProcessLostTicketUseCase processLostTicketUseCase,
      VoidSessionUseCase voidSessionUseCase,
      GetTicketUseCase getTicketUseCase,
      ListActiveSessionsUseCase listActiveSessionsUseCase,
      FindActiveSessionUseCase findActiveSessionUseCase) {
    this.supervisorService = supervisorService;
    this.registerEntryUseCase = registerEntryUseCase;
    this.registerExitUseCase = registerExitUseCase;
    this.reprintTicketUseCase = reprintTicketUseCase;
    this.processLostTicketUseCase = processLostTicketUseCase;
    this.voidSessionUseCase = voidSessionUseCase;
    this.getTicketUseCase = getTicketUseCase;
    this.listActiveSessionsUseCase = listActiveSessionsUseCase;
    this.findActiveSessionUseCase = findActiveSessionUseCase;
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
    // #region agent log
    AgentDebugNdjson.line(
        "H1",
        "OperationController.java:registerEntry",
        "entry HTTP body accepted (validated)",
        Map.ofEntries(
            Map.entry("type", request.type() != null ? request.type() : "null"),
            Map.entry(
                "sitePresent", request.site() != null && !request.site().isBlank()),
            Map.entry("plateLen", request.plate() != null ? request.plate().length() : 0),
            Map.entry("rateIdPresent", request.rateId() != null),
            Map.entry(
                "idempotencyPresent",
                request.idempotencyKey() != null && !request.idempotencyKey().isBlank())));
    // #endregion
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
    return reprintTicketUseCase.execute(request);
  }

  @PostMapping("/tickets/lost")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  public OperationResultResponse lost(@Valid @RequestBody LostTicketRequest request) {
    return processLostTicketUseCase.execute(request);
  }

  @PostMapping("/tickets/void")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  public OperationResultResponse voidTicket(@Valid @RequestBody VoidRequest request) {
    return voidSessionUseCase.execute(request);
  }

  @GetMapping("/sessions/active")
  @PreAuthorize("hasAuthority('tickets:emitir') or hasAuthority('cobros:registrar')")
  public OperationResultResponse active(
      @RequestParam(required = false) String ticketNumber,
      @RequestParam(required = false) String plate,
      @RequestParam(required = false) String agreementCode) {
    return findActiveSessionUseCase.execute(ticketNumber, plate, agreementCode);
  }

  @GetMapping("/tickets/{ticketNumber}")
  @PreAuthorize("hasAuthority('tickets:emitir') or hasAuthority('cobros:registrar')")
  public OperationResultResponse getTicket(@PathVariable String ticketNumber) {
    return getTicketUseCase.execute(ticketNumber);
  }

  @GetMapping("/sessions/active-list")
  @PreAuthorize("hasAuthority('reportes:leer') or hasAuthority('tickets:emitir')")
  public List<ReceiptResponse> activeList() {
    return listActiveSessionsUseCase.execute();
  }
}
