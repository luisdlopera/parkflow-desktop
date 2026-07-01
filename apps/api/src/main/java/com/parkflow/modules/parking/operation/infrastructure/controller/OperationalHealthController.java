package com.parkflow.modules.parking.operation.infrastructure.controller;

import com.parkflow.modules.parking.operation.dto.OperationalHealthResponse;
import com.parkflow.modules.parking.operation.application.port.in.OperationalHealthUseCase;
import java.time.OffsetDateTime;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "OperationalHealth", description = "OperationalHealth endpoints")
@RequestMapping("/api/v1/health/operational")
@RequiredArgsConstructor
public class OperationalHealthController {
  private final OperationalHealthUseCase operationalHealthService;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('reportes:leer')")
  public OperationalHealthResponse getOperationalHealth() {
    return operationalHealthService.getOperationalHealth();
  }

  @PostMapping("/retry-sync")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
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
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('reportes:leer')")
  public Map<String, Object> testPrinter() {
    OperationalHealthResponse snapshot = operationalHealthService.getOperationalHealth();
    return Map.of(
        "status", snapshot.printerStatus(),
        "message", "Verificación de impresora ejecutada. Revise la cola y errores recientes.",
        "requestedAt", OffsetDateTime.now());
  }
}
