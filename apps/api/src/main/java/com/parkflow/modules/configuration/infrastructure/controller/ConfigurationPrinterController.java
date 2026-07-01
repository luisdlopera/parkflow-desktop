package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.PrinterUseCase;
import com.parkflow.modules.configuration.dto.PrinterRequest;
import com.parkflow.modules.configuration.dto.PrinterResponse;
import com.parkflow.modules.common.dto.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/printers")
@RequiredArgsConstructor
public class ConfigurationPrinterController {

  private final PrinterUseCase printerUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PageResponse<PrinterResponse> list(
      @RequestParam(required = false) UUID siteId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return printerUseCase.list(siteId, q, active, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PrinterResponse get(@PathVariable UUID id) {
    return printerUseCase.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public PrinterResponse create(
      @RequestParam UUID siteId,
      @Valid @RequestBody PrinterRequest req) {
    return printerUseCase.create(siteId, req);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public PrinterResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody PrinterRequest req) {
    return printerUseCase.update(id, req);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public PrinterResponse patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return printerUseCase.patchStatus(id, active);
  }
}
