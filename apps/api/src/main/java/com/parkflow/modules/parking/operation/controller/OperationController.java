package com.parkflow.modules.parking.operation.controller;

import com.parkflow.modules.common.debug.AgentDebugNdjson;
import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.application.port.out.SessionEventPort;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.application.port.in.*;
import com.parkflow.modules.parking.operation.application.service.SupervisorService;
import com.parkflow.modules.auth.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/operations")
@Tag(name = "Operations", description = "Parking operations: entries, exits, tickets, sessions")
public class OperationController {
  private final SupervisorService supervisorService;
  private final SessionEventPort sessionEventPort;
  private final RegisterEntryUseCase registerEntryUseCase;
  private final RegisterExitUseCase registerExitUseCase;
  private final ReprintTicketUseCase reprintTicketUseCase;
  private final ProcessLostTicketUseCase processLostTicketUseCase;
  private final VoidSessionUseCase voidSessionUseCase;
  private final GetTicketUseCase getTicketUseCase;
  private final ListActiveSessionsUseCase listActiveSessionsUseCase;
  private final FindActiveSessionUseCase findActiveSessionUseCase;
  private final UpdatePlateUseCase updatePlateUseCase;
  private final BulkExitCalculateUseCase bulkExitCalculateUseCase;
  private final BulkExitProcessUseCase bulkExitProcessUseCase;
  private final MassExitPreviewUseCase massExitPreviewUseCase;
  private final MassExitProcessUseCase massExitProcessUseCase;

  public OperationController(
      SupervisorService supervisorService,
      SessionEventPort sessionEventPort,
      RegisterEntryUseCase registerEntryUseCase,
      RegisterExitUseCase registerExitUseCase,
      ReprintTicketUseCase reprintTicketUseCase,
      ProcessLostTicketUseCase processLostTicketUseCase,
      VoidSessionUseCase voidSessionUseCase,
      GetTicketUseCase getTicketUseCase,
      ListActiveSessionsUseCase listActiveSessionsUseCase,
      FindActiveSessionUseCase findActiveSessionUseCase,
      UpdatePlateUseCase updatePlateUseCase,
      BulkExitCalculateUseCase bulkExitCalculateUseCase,
      BulkExitProcessUseCase bulkExitProcessUseCase,
      MassExitPreviewUseCase massExitPreviewUseCase,
      MassExitProcessUseCase massExitProcessUseCase) {
    this.supervisorService = supervisorService;
    this.sessionEventPort = sessionEventPort;
    this.registerEntryUseCase = registerEntryUseCase;
    this.registerExitUseCase = registerExitUseCase;
    this.reprintTicketUseCase = reprintTicketUseCase;
    this.processLostTicketUseCase = processLostTicketUseCase;
    this.voidSessionUseCase = voidSessionUseCase;
    this.getTicketUseCase = getTicketUseCase;
    this.listActiveSessionsUseCase = listActiveSessionsUseCase;
    this.findActiveSessionUseCase = findActiveSessionUseCase;
    this.updatePlateUseCase = updatePlateUseCase;
    this.bulkExitCalculateUseCase = bulkExitCalculateUseCase;
    this.bulkExitProcessUseCase = bulkExitProcessUseCase;
    this.massExitPreviewUseCase = massExitPreviewUseCase;
    this.massExitProcessUseCase = massExitProcessUseCase;
  }

  @GetMapping("/supervisor/summary")
  @PreAuthorize("hasAuthority('reportes:leer')")
  @Operation(summary = "Supervisor summary", description = "Returns operational summary for supervisors")
  @ApiResponse(responseCode = "200", description = "Summary retrieved")
  public OperationsSummaryResponse supervisorSummary(
      @RequestParam(name = "timeZone", required = false) @Parameter(description = "Timezone for summary calculations") String timeZone) {
    ZoneId zone =
        (timeZone != null && !timeZone.isBlank())
            ? ZoneId.of(timeZone)
            : ZoneId.of("America/Bogota");
    return supervisorService.buildSummary(zone);
  }

  @PostMapping("/entries")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tickets:emitir')")
  @Operation(summary = "Register a vehicle entry", description = "Creates a new parking session for a vehicle (motorcycle, car, etc.)")
  @ApiResponse(responseCode = "201", description = "Entry registered successfully",
      content = @Content(schema = @Schema(implementation = OperationResultResponse.class)))
  @ApiResponse(responseCode = "400", description = "Invalid request payload")
  @ApiResponse(responseCode = "403", description = "Forbidden: missing tickets:emitir permission or company not active")
  @ApiResponse(responseCode = "409", description = "Conflict: duplicate active plate or parking full")
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
  @Operation(summary = "Register a vehicle exit", description = "Closes an active parking session and calculates payment")
  @ApiResponse(responseCode = "200", description = "Exit registered",
      content = @Content(schema = @Schema(implementation = OperationResultResponse.class)))
  @ApiResponse(responseCode = "400", description = "Invalid request")
  @ApiResponse(responseCode = "403", description = "Forbidden: missing cobros:registrar permission")
  @ApiResponse(responseCode = "404", description = "Active session not found")
  public OperationResultResponse registerExit(@Valid @RequestBody ExitRequest request) {
    return registerExitUseCase.execute(request);
  }

  @PostMapping("/tickets/reprint")
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  @Operation(summary = "Reprint a ticket", description = "Reprints an entry or exit ticket")
  @ApiResponse(responseCode = "200", description = "Ticket reprinted",
      content = @Content(schema = @Schema(implementation = OperationResultResponse.class)))
  @ApiResponse(responseCode = "403", description = "Forbidden: missing tickets:imprimir permission")
  @ApiResponse(responseCode = "404", description = "Ticket not found")
  public OperationResultResponse reprint(@Valid @RequestBody ReprintRequest request) {
    return reprintTicketUseCase.execute(request);
  }

  @GetMapping("/tickets/{ticketNumber}/reprints")
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  @Operation(summary = "Get reprint history", description = "Returns the reprint history for a given ticket")
  @ApiResponse(responseCode = "200", description = "Reprint history retrieved",
      content = @Content(schema = @Schema(implementation = ReprintHistoryEntry.class)))
  @ApiResponse(responseCode = "403", description = "Forbidden: missing tickets:imprimir permission")
  public List<ReprintHistoryEntry> getReprintHistory(@PathVariable @Parameter(description = "Ticket number") String ticketNumber) {
    UUID companyId = SecurityUtils.requireCompanyId();
    List<SessionEvent> events = sessionEventPort.findReprintEventsByTicketNumber(ticketNumber.trim(), companyId);
    return events.stream().map(event -> {
      String reason = event.getMetadata();
      int reprintNumber = 1;
      try {
        if (event.getMetadata() != null && event.getMetadata().contains("\"reprintNumber\"")) {
          String numStr = event.getMetadata().replaceAll(".*\"reprintNumber\"\\s*:\\s*(\\d+).*", "$1");
          reprintNumber = Integer.parseInt(numStr);
        }
      } catch (Exception ignored) {}
      return new ReprintHistoryEntry(
          event.getId(),
          event.getActorUser() != null ? event.getActorUser().getName() : null,
          event.getActorUser() != null ? event.getActorUser().getId() : null,
          reason,
          reprintNumber,
          event.getCreatedAt());
    }).toList();
  }

  @PostMapping("/tickets/lost")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  @Operation(summary = "Mark ticket as lost", description = "Marks a parking session as lost ticket")
  @ApiResponse(responseCode = "200", description = "Ticket marked as lost",
      content = @Content(schema = @Schema(implementation = OperationResultResponse.class)))
  @ApiResponse(responseCode = "403", description = "Forbidden: missing anulaciones:crear permission")
  @ApiResponse(responseCode = "404", description = "Ticket not found")
  public OperationResultResponse lost(@Valid @RequestBody LostTicketRequest request) {
    return processLostTicketUseCase.execute(request);
  }

  @PostMapping("/tickets/void")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  @Operation(summary = "Void a ticket", description = "Cancels an active parking session")
  @ApiResponse(responseCode = "200", description = "Ticket voided",
      content = @Content(schema = @Schema(implementation = OperationResultResponse.class)))
  @ApiResponse(responseCode = "403", description = "Forbidden: missing anulaciones:crear permission")
  @ApiResponse(responseCode = "404", description = "Ticket not found")
  public OperationResultResponse voidTicket(@Valid @RequestBody VoidRequest request) {
    return voidSessionUseCase.execute(request);
  }

  @GetMapping("/sessions/active")
  @PreAuthorize("hasAuthority('tickets:emitir') or hasAuthority('cobros:registrar')")
  @Operation(summary = "Find active session", description = "Finds an active session by ticket number, plate, or agreement code")
  @ApiResponse(responseCode = "200", description = "Active session found",
      content = @Content(schema = @Schema(implementation = OperationResultResponse.class)))
  @ApiResponse(responseCode = "404", description = "Active session not found")
  public OperationResultResponse active(
      @RequestParam(required = false) @Parameter(description = "Ticket number") String ticketNumber,
      @RequestParam(required = false) @Parameter(description = "Vehicle plate") String plate,
      @RequestParam(required = false) @Parameter(description = "Agreement code") String agreementCode) {
    return findActiveSessionUseCase.execute(ticketNumber, plate, agreementCode);
  }

  @GetMapping("/tickets/{ticketNumber}")
  @PreAuthorize("hasAuthority('tickets:emitir') or hasAuthority('cobros:registrar')")
  @Operation(summary = "Get ticket details", description = "Returns details for a given ticket number")
  @ApiResponse(responseCode = "200", description = "Ticket found",
      content = @Content(schema = @Schema(implementation = OperationResultResponse.class)))
  @ApiResponse(responseCode = "404", description = "Ticket not found")
  public OperationResultResponse getTicket(@PathVariable @Parameter(description = "Ticket number") String ticketNumber) {
    return getTicketUseCase.execute(ticketNumber);
  }

  @GetMapping("/sessions/active-list")
  @PreAuthorize("hasAuthority('reportes:leer') or hasAuthority('tickets:emitir')")
  @Operation(summary = "List active sessions", description = "Returns a paginated list of active parking sessions")
  @ApiResponse(responseCode = "200", description = "List of active sessions")
  public com.parkflow.modules.parking.operation.dto.PaginatedResponse<ReceiptResponse> activeList(
      @RequestParam(defaultValue = "1") @Parameter(description = "Page number") int page,
      @RequestParam(defaultValue = "25") @Parameter(description = "Page size") int limit,
      @RequestParam(required = false) @Parameter(description = "Search term") String search,
      @RequestParam(defaultValue = "entryAt") @Parameter(description = "Sort field") String sortBy,
      @RequestParam(defaultValue = "desc") @Parameter(description = "Sort direction") String sortDir
  ) {
    return listActiveSessionsUseCase.execute(page, limit, search, sortBy, sortDir);
  }

  @PatchMapping("/sessions/{id}/plate")
  @PreAuthorize("hasAuthority('anulaciones:crear') or hasAuthority('tickets:emitir')")
  @Operation(summary = "Update session plate", description = "Corrects the plate of an active parking session")
  @ApiResponse(responseCode = "200", description = "Plate updated")
  @ApiResponse(responseCode = "400", description = "Invalid plate")
  @ApiResponse(responseCode = "404", description = "Session not found")
  public void updatePlate(@PathVariable @Parameter(description = "Session UUID") java.util.UUID id, @Valid @RequestBody UpdatePlateRequest request) {
    updatePlateUseCase.execute(id, request);
  }

  @PostMapping("/bulk-exits/calculate")
  @PreAuthorize("hasAuthority('cobros:registrar')")
  @Operation(summary = "Precalculate bulk exits", description = "Calculates amounts for multiple exits without committing")
  @ApiResponse(responseCode = "200", description = "Bulk exit calculation",
      content = @Content(schema = @Schema(implementation = BulkExitCalculateResponse.class)))
  public BulkExitCalculateResponse calculateBulkExit(@Valid @RequestBody BulkExitRequest request) {
    return bulkExitCalculateUseCase.precalculate(request);
  }

  @PostMapping("/bulk-exits")
  @PreAuthorize("hasAuthority('cobros:registrar')")
  @Operation(summary = "Process bulk exits", description = "Registers exits for multiple active sessions")
  @ApiResponse(responseCode = "200", description = "Bulk exits processed",
      content = @Content(schema = @Schema(implementation = BulkExitResponse.class)))
  public BulkExitResponse processBulkExit(@Valid @RequestBody BulkExitRequest request) {
    return bulkExitProcessUseCase.process(request);
  }

  @PostMapping("/mass-exit/calculate")
  @PreAuthorize("hasAuthority('parking:salida_masiva')")
  @Operation(summary = "Preview mass vehicle exit", description = "Calculates estimated amounts for a filtered set of active sessions without committing")
  @ApiResponse(responseCode = "200", description = "Preview calculated")
  @ApiResponse(responseCode = "403", description = "Forbidden: requires parking:salida_masiva permission")
  public com.parkflow.modules.parking.operation.dto.MassExitPreviewResponse previewMassExit(
      @Valid @RequestBody com.parkflow.modules.parking.operation.dto.MassExitFilterRequest request) {
    return massExitPreviewUseCase.preview(request);
  }

  @PostMapping("/mass-exit")
  @PreAuthorize("hasAuthority('parking:salida_masiva')")
  @Operation(summary = "Process mass vehicle exit", description = "Registers exits for all active sessions matching the given filters. Continue-on-error: individual failures do not roll back the batch.")
  @ApiResponse(responseCode = "200", description = "Mass exit processed")
  @ApiResponse(responseCode = "403", description = "Forbidden: requires parking:salida_masiva permission")
  public com.parkflow.modules.parking.operation.dto.MassExitResponse processMassExit(
      @Valid @RequestBody com.parkflow.modules.parking.operation.dto.MassExitFilterRequest request) {
    return massExitProcessUseCase.process(request);
  }
}
