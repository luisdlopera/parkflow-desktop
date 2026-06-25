package com.parkflow.modules.cash.infrastructure.controller;

import com.parkflow.modules.cash.application.port.in.CashConfigurationUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionManagementUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionQueryUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionAuditUseCase;
import com.parkflow.modules.cash.application.port.in.GetCashMovementsUseCase;
import com.parkflow.modules.cash.application.port.in.RegisterCashMovementUseCase;
import com.parkflow.modules.cash.application.port.in.VoidCashMovementUseCase;
import com.parkflow.modules.cash.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cash")
@RequiredArgsConstructor
@Tag(name = "Cash Management", description = "Cash session and movement operations")
public class CashController {
  private final CashSessionManagementUseCase cashSessionManagementUseCase;
  private final CashSessionQueryUseCase cashSessionQueryUseCase;
  private final CashSessionAuditUseCase cashSessionAuditUseCase;
  private final RegisterCashMovementUseCase registerCashMovementUseCase;
  private final VoidCashMovementUseCase voidCashMovementUseCase;
  private final GetCashMovementsUseCase getCashMovementsUseCase;
  private final CashConfigurationUseCase cashConfigurationUseCase;

  @GetMapping("/policy")
  @PreAuthorize(
      "hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar') or hasAuthority('cobros:registrar') or hasAuthority('reportes:leer')")
  @Operation(
      summary = "Get cash policy",
      description = "Returns cash management policy and constraints for a site or default policy")
  @ApiResponse(responseCode = "200", description = "Policy retrieved successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  public CashPolicyResponse policy(@RequestParam(required = false) String site) {
    return cashConfigurationUseCase.getPolicy(site);
  }

  @GetMapping("/registers")
  @PreAuthorize("hasAuthority('cierres_caja:abrir') or hasAuthority('reportes:leer')")
  @Operation(
      summary = "List cash registers",
      description = "Returns all active cash registers for a site or entire company")
  @ApiResponse(responseCode = "200", description = "Registers retrieved successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  public List<CashRegisterInfoResponse> registers(@RequestParam(required = false) String site) {
    return cashConfigurationUseCase.listRegisters(site);
  }

  @PostMapping("/open")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('cierres_caja:abrir')")
  @Operation(
      summary = "Open cash session",
      description = "Creates and opens a new cash session with opening amount and operator info")
  @ApiResponse(responseCode = "201", description = "Cash session opened successfully")
  @ApiResponse(responseCode = "400", description = "Invalid request - missing required fields or validation errors")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions or operator inactive")
  @ApiResponse(responseCode = "409", description = "Conflict - session already open for register or multiple sessions policy violated")
  public CashSessionResponse open(@Valid @RequestBody OpenCashRequest request) {
    return cashSessionManagementUseCase.open(request);
  }

  @GetMapping("/current")
  @PreAuthorize(
      "hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar') or hasAuthority('cobros:registrar')")
  @Operation(
      summary = "Get current cash session",
      description = "Returns the currently open cash session for a site/terminal combination")
  @ApiResponse(responseCode = "200", description = "Current session retrieved successfully")
  @ApiResponse(responseCode = "400", description = "Bad request - terminal not specified")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  @ApiResponse(responseCode = "404", description = "Not found - no open session for site/terminal")
  public CashSessionResponse current(
      @RequestParam(required = false) String site, @RequestParam(required = false) String terminal) {
    return cashSessionQueryUseCase.getCurrent(site, terminal);
  }

  @GetMapping("/sessions")
  @PreAuthorize("hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir')")
  @Operation(
      summary = "List cash sessions",
      description = "Returns paginated list of cash sessions ordered by opening date (newest first)")
  @ApiResponse(responseCode = "200", description = "Sessions retrieved successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  public Page<CashSessionResponse> sessions(@PageableDefault(size = 20) Pageable pageable) {
    return cashSessionQueryUseCase.listSessions(pageable);
  }

  @GetMapping("/sessions/{id}")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar')")
  @Operation(
      summary = "Get cash session by ID",
      description = "Returns details of a specific cash session including all movements and counts")
  @ApiResponse(responseCode = "200", description = "Session retrieved successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions or access denied to this session")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist")
  public CashSessionResponse session(@PathVariable UUID id) {
    return cashSessionQueryUseCase.getSession(id);
  }

  @GetMapping("/sessions/{id}/movements")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar')")
  @Operation(
      summary = "List movements in cash session",
      description = "Returns all cash movements (payments, voids, adjustments) recorded in a session")
  @ApiResponse(responseCode = "200", description = "Movements retrieved successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions or access denied to this session")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist")
  public List<CashMovementResponse> movements(@PathVariable UUID id) {
    return getCashMovementsUseCase.listMovements(id);
  }

  @PostMapping("/sessions/{id}/movements")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('cobros:registrar')")
  @Operation(
      summary = "Record cash movement",
      description = "Records a new cash movement (payment, deposit, adjustment) in the session")
  @ApiResponse(responseCode = "201", description = "Movement recorded successfully")
  @ApiResponse(responseCode = "400", description = "Invalid request - invalid amount or missing required fields")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist")
  @ApiResponse(responseCode = "409", description = "Conflict - session not open or amount exceeds balance")
  public CashMovementResponse addMovement(
      @PathVariable UUID id, @Valid @RequestBody CashMovementRequest request) {
    return registerCashMovementUseCase.addMovement(id, request);
  }

  @PostMapping("/sessions/{id}/movements/{movementId}/void")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  @Operation(
      summary = "Void cash movement",
      description = "Reverses a previously recorded cash movement (marks as voided)")
  @ApiResponse(responseCode = "200", description = "Movement voided successfully")
  @ApiResponse(responseCode = "400", description = "Invalid request - validation errors")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  @ApiResponse(responseCode = "404", description = "Not found - session or movement does not exist")
  @ApiResponse(responseCode = "409", description = "Conflict - movement already voided or session not open")
  public CashMovementResponse voidMovement(
      @PathVariable UUID id,
      @PathVariable UUID movementId,
      @Valid @RequestBody VoidMovementRequest request) {
    return voidCashMovementUseCase.voidMovement(id, movementId, request);
  }

  @GetMapping("/sessions/{id}/summary")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar')")
  @Operation(
      summary = "Get cash session summary",
      description = "Returns aggregated summary of cash session with totals by payment method and movement type")
  @ApiResponse(responseCode = "200", description = "Summary retrieved successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions or access denied")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist")
  public CashSummaryResponse summary(@PathVariable UUID id) {
    return cashSessionAuditUseCase.getSummary(id);
  }

  @PostMapping("/sessions/{id}/count")
  @PreAuthorize("hasAuthority('cierres_caja:cerrar')")
  @Operation(
      summary = "Submit cash count",
      description = "Records the physical count of cash and other payment methods for reconciliation")
  @ApiResponse(responseCode = "200", description = "Count submitted successfully")
  @ApiResponse(responseCode = "400", description = "Invalid request - empty denominations or other validation errors")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist")
  @ApiResponse(responseCode = "409", description = "Conflict - session not open or already counted")
  public CashSessionResponse count(@PathVariable UUID id, @Valid @RequestBody CashCountRequest request) {
    return cashSessionManagementUseCase.submitCount(id, request);
  }

  @PostMapping("/sessions/{id}/close")
  @PreAuthorize("hasAuthority('cierres_caja:cerrar')")
  @Operation(
      summary = "Close cash session",
      description = "Closes an open cash session, finalizing the audit and generating closing report")
  @ApiResponse(responseCode = "200", description = "Session closed successfully")
  @ApiResponse(responseCode = "400", description = "Invalid request - not counted or missing observations for discrepancy")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions or discrepancy exceeds tolerance")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist")
  @ApiResponse(responseCode = "409", description = "Conflict - session not open or active vehicles still parked")
  public CashSessionResponse close(@PathVariable UUID id, @Valid @RequestBody CashCloseRequest request) {
    return cashSessionManagementUseCase.close(id, request);
  }

  @PostMapping("/sessions/{id}/print-closing")
  @PreAuthorize("hasAuthority('cierres_caja:cerrar') or hasAuthority('reportes:leer')")
  @Operation(
      summary = "Generate closing report for printing",
      description = "Generates a formatted closing report document ready for printing")
  @ApiResponse(responseCode = "200", description = "Closing report generated successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist or not closed")
  public CashClosingPrintResponse printClosing(@PathVariable UUID id) {
    return cashConfigurationUseCase.printClosing(id);
  }

  @GetMapping("/sessions/{id}/audit")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:cerrar')")
  @Operation(
      summary = "Get audit trail for cash session",
      description = "Returns complete audit log of all actions performed on the cash session")
  @ApiResponse(responseCode = "200", description = "Audit trail retrieved successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Insufficient permissions or access denied")
  @ApiResponse(responseCode = "404", description = "Not found - session does not exist")
  public List<CashAuditEntryResponse> audit(@PathVariable UUID id) {
    return cashSessionAuditUseCase.getAuditTrail(id);
  }
}
