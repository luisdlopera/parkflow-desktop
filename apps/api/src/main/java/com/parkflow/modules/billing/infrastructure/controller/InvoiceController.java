package com.parkflow.modules.billing.infrastructure.controller;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.billing.application.service.InvoiceService;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.dto.CancelInvoiceRequest;
import com.parkflow.modules.billing.dto.CreateInvoiceRequest;
import com.parkflow.modules.billing.dto.InvoiceDashboardResponse;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * @deprecated Use {@link com.parkflow.modules.billing.application.service.InvoiceGenerationService}
 * and {@link com.parkflow.modules.billing.application.service.InvoiceQueryService} with hexagonal ports instead.
 */
@Deprecated(since = "2.1.0", forRemoval = false)
@SuppressWarnings("deprecation")
@RestController
@RequestMapping("/api/v1/billing/invoices")
@RequiredArgsConstructor
@Tag(name = "Billing Invoices", description = "Electronic invoice management")
public class InvoiceController {

  private final InvoiceService invoiceService;

  @GetMapping("/dashboard")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "Get invoice dashboard metrics for the current tenant")
  public ResponseEntity<InvoiceDashboardResponse> dashboard() {
    UUID companyId = TenantContext.getTenantId();
    return ResponseEntity.ok(invoiceService.getDashboard(companyId));
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "List invoices with optional filters")
  public ResponseEntity<Page<InvoiceResponse>> list(
      @RequestParam(required = false) InvoiceStatus status,
      @RequestParam(required = false) String clientName,
      Pageable pageable) {
    UUID companyId = TenantContext.getTenantId();
    return ResponseEntity.ok(invoiceService.listInvoices(companyId, status, clientName, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "Get invoice by ID")
  public ResponseEntity<InvoiceResponse> get(@PathVariable UUID id) {
    UUID companyId = TenantContext.getTenantId();
    return ResponseEntity.ok(invoiceService.getInvoice(id, companyId));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Create a manual invoice and send to the configured provider")
  public ResponseEntity<InvoiceResponse> create(@Valid @RequestBody CreateInvoiceRequest request) {
    UUID companyId = TenantContext.getTenantId();
    return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createManualInvoice(companyId, request));
  }

  @PostMapping("/{id}/cancel")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Cancel an invoice and notify the provider")
  public ResponseEntity<InvoiceResponse> cancel(
      @PathVariable UUID id,
      @Valid @RequestBody CancelInvoiceRequest request) {
    UUID companyId = TenantContext.getTenantId();
    return ResponseEntity.ok(invoiceService.cancelInvoice(id, companyId, request.getReason()));
  }

  @GetMapping("/{id}/pdf")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "Download invoice PDF from provider")
  public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID id) {
    UUID companyId = TenantContext.getTenantId();
    byte[] pdfContent = invoiceService.getInvoicePdf(id, companyId);
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoice-" + id + ".pdf\"")
        .body(pdfContent);
  }
}
