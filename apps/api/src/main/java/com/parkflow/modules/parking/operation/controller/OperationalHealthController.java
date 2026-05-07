package com.parkflow.modules.parking.operation.controller;

import com.parkflow.modules.parking.operation.dto.OperationalHealthResponse;
import com.parkflow.modules.parking.operation.service.OperationalHealthService;
import java.time.OffsetDateTime;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health/operational")
@RequiredArgsConstructor
public class OperationalHealthController {
  private final OperationalHealthService operationalHealthService;

  @GetMapping
  @PreAuthorize("hasAuthority('reportes:leer')")
  public OperationalHealthResponse getOperationalHealth() {
    return operationalHealthService.getOperationalHealth();
  }

  @PostMapping("/retry-sync")
  @PreAuthorize("hasAuthority('reportes:leer')")
  public Map<String, Object> retrySync() {
    OperationalHealthResponse snapshot = operationalHealthService.getOperationalHealth();
    return Map.of(
        "status", "OK",
        "message", "Reintento de sync solicitado. El sistema seguirá procesando la outbox.",
        "outboxPending", snapshot.outboxPending(),
        "requestedAt", OffsetDateTime.now());
  }

  @PostMapping("/test-printer")
  @PreAuthorize("hasAuthority('reportes:leer')")
  public Map<String, Object> testPrinter() {
    OperationalHealthResponse snapshot = operationalHealthService.getOperationalHealth();
    return Map.of(
        "status", snapshot.printerStatus(),
        "message", "Verificación de impresora ejecutada. Revise la cola y errores recientes.",
        "requestedAt", OffsetDateTime.now());
  }
}
