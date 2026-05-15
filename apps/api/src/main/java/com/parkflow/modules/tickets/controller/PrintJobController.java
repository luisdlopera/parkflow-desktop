package com.parkflow.modules.tickets.controller;

import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.dto.PrintJobResponse;
import com.parkflow.modules.tickets.dto.RetryPrintJobRequest;
import com.parkflow.modules.tickets.dto.UpdatePrintJobStatusRequest;
import com.parkflow.modules.tickets.application.port.in.TicketPrintUseCase;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/print-jobs", "/api/v1/tickets/print-jobs"})
@RequiredArgsConstructor
public class PrintJobController {
  private final TicketPrintUseCase ticketPrintUseCase;

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  public PrintJobResponse create(@Valid @RequestBody CreatePrintJobRequest request) {
    return ticketPrintUseCase.create(request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  public PrintJobResponse updateStatus(
      @PathVariable UUID id,
      @Valid @RequestBody UpdatePrintJobStatusRequest request) {
    return ticketPrintUseCase.updateStatus(id, request);
  }

  @PostMapping("/{id}/retry")
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  public PrintJobResponse retry(@PathVariable UUID id, @Valid @RequestBody RetryPrintJobRequest request) {
    return ticketPrintUseCase.retry(id, request);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  public PrintJobResponse get(@PathVariable UUID id) {
    return ticketPrintUseCase.get(id);
  }

  @GetMapping
  @PreAuthorize("hasAuthority('tickets:imprimir')")
  public List<PrintJobResponse> list(
      @RequestParam(required = false) UUID sessionId,
      @RequestParam(required = false) String ticketNumber) {
    if (ticketNumber != null && !ticketNumber.isBlank()) {
      return ticketPrintUseCase.listByTicket(ticketNumber);
    }
    if (sessionId == null) {
      throw new IllegalArgumentException("sessionId o ticketNumber es obligatorio");
    }
    return ticketPrintUseCase.listBySession(sessionId);
  }
}
