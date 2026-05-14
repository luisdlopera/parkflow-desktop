package com.parkflow.modules.cash.controller;

import com.parkflow.modules.cash.application.port.in.CashConfigurationUseCase;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionUseCase;
import com.parkflow.modules.cash.dto.*;
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
public class CashController {
  private final CashSessionUseCase cashSessionUseCase;
  private final CashMovementUseCase cashMovementUseCase;
  private final CashConfigurationUseCase cashConfigurationUseCase;

  @GetMapping("/policy")
  @PreAuthorize(
      "hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar') or hasAuthority('cobros:registrar') or hasAuthority('reportes:leer')")
  public CashPolicyResponse policy(@RequestParam(required = false) String site) {
    return cashConfigurationUseCase.getPolicy(site);
  }

  @GetMapping("/registers")
  @PreAuthorize("hasAuthority('cierres_caja:abrir') or hasAuthority('reportes:leer')")
  public List<CashRegisterInfoResponse> registers(@RequestParam(required = false) String site) {
    return cashConfigurationUseCase.listRegisters(site);
  }

  @PostMapping("/open")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('cierres_caja:abrir')")
  public CashSessionResponse open(@Valid @RequestBody OpenCashRequest request) {
    return cashSessionUseCase.open(request);
  }

  @GetMapping("/current")
  @PreAuthorize(
      "hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar') or hasAuthority('cobros:registrar')")
  public CashSessionResponse current(
      @RequestParam(required = false) String site, @RequestParam(required = false) String terminal) {
    return cashSessionUseCase.getCurrent(site, terminal);
  }

  @GetMapping("/sessions")
  @PreAuthorize("hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir')")
  public Page<CashSessionResponse> sessions(@PageableDefault(size = 20) Pageable pageable) {
    return cashSessionUseCase.listSessions(pageable);
  }

  @GetMapping("/sessions/{id}")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar')")
  public CashSessionResponse session(@PathVariable UUID id) {
    return cashSessionUseCase.getSession(id);
  }

  @GetMapping("/sessions/{id}/movements")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar')")
  public List<CashMovementResponse> movements(@PathVariable UUID id) {
    return cashMovementUseCase.listMovements(id);
  }

  @PostMapping("/sessions/{id}/movements")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('cobros:registrar')")
  public CashMovementResponse addMovement(
      @PathVariable UUID id, @Valid @RequestBody CashMovementRequest request) {
    return cashMovementUseCase.addMovement(id, request);
  }

  @PostMapping("/sessions/{id}/movements/{movementId}/void")
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  public CashMovementResponse voidMovement(
      @PathVariable UUID id,
      @PathVariable UUID movementId,
      @Valid @RequestBody VoidMovementRequest request) {
    return cashMovementUseCase.voidMovement(id, movementId, request);
  }

  @GetMapping("/sessions/{id}/summary")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:abrir') or hasAuthority('cierres_caja:cerrar')")
  public CashSummaryResponse summary(@PathVariable UUID id) {
    return cashSessionUseCase.getSummary(id);
  }

  @PostMapping("/sessions/{id}/count")
  @PreAuthorize("hasAuthority('cierres_caja:cerrar')")
  public CashSessionResponse count(@PathVariable UUID id, @Valid @RequestBody CashCountRequest request) {
    return cashSessionUseCase.submitCount(id, request);
  }

  @PostMapping("/sessions/{id}/close")
  @PreAuthorize("hasAuthority('cierres_caja:cerrar')")
  public CashSessionResponse close(@PathVariable UUID id, @Valid @RequestBody CashCloseRequest request) {
    return cashSessionUseCase.close(id, request);
  }

  @PostMapping("/sessions/{id}/print-closing")
  @PreAuthorize("hasAuthority('cierres_caja:cerrar') or hasAuthority('reportes:leer')")
  public CashClosingPrintResponse printClosing(@PathVariable UUID id) {
    return cashConfigurationUseCase.printClosing(id);
  }

  @GetMapping("/sessions/{id}/audit")
  @PreAuthorize(
      "hasAuthority('reportes:leer') or hasAuthority('cierres_caja:cerrar')")
  public List<CashAuditEntryResponse> audit(@PathVariable UUID id) {
    return cashSessionUseCase.getAuditTrail(id);
  }
}
