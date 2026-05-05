package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.dto.PrinterRequest;
import com.parkflow.modules.configuration.dto.PrinterResponse;
import com.parkflow.modules.configuration.service.PrinterService;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/printers")
@RequiredArgsConstructor
public class ConfigurationPrinterController {

  private final PrinterService printerService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<PrinterResponse>> list(
      @RequestParam(required = false) UUID siteId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(printerService.list(siteId, q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<PrinterResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(printerService.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PrinterResponse> create(
      @RequestParam UUID siteId,
      @Valid @RequestBody PrinterRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(printerService.create(siteId, req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PrinterResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody PrinterRequest req) {
    return ResponseEntity.ok(printerService.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PrinterResponse> patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return ResponseEntity.ok(printerService.patchStatus(id, active));
  }
}
