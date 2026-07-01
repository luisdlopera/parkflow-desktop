package com.parkflow.modules.billing.infrastructure.controller;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.billing.application.service.InvoiceGenerationService;
import com.parkflow.modules.billing.application.service.InvoiceQueryService;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.dto.CancelInvoiceRequest;
import com.parkflow.modules.billing.dto.CreateInvoiceRequest;
import com.parkflow.modules.billing.dto.InvoiceDashboardResponse;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** REST endpoints for invoice generation and query operations. */
@RestController
@RequestMapping("/api/v1/billing/invoices")
@RequiredArgsConstructor
@Tag(name = "Billing Invoices", description = "Electronic invoice management")
public class InvoiceController {

  private final InvoiceGenerationService invoiceGenerationService;
  private final InvoiceQueryService invoiceQueryService;

  @GetMapping("/dashboard")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "Get invoice dashboard metrics for the current tenant")
  public InvoiceDashboardResponse dashboard() {
    UUID companyId = TenantContext.getTenantId();
    return invoiceQueryService.getDashboard(companyId);
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "List invoices with optional filters")
  public com.parkflow.modules.common.dto.PageResponse<InvoiceResponse> list(
      @RequestParam(required = false) InvoiceStatus status,
      @RequestParam(required = false) String clientName,
      Pageable pageable) {
    UUID companyId = TenantContext.getTenantId();
    return invoiceQueryService.listInvoices(companyId, status, clientName, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "Get invoice by ID")
  public InvoiceResponse get(@PathVariable UUID id) {
    UUID companyId = TenantContext.getTenantId();
    return invoiceQueryService.getInvoice(id, companyId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Create a manual invoice and send to the configured provider")
  public InvoiceResponse create(@Valid @RequestBody CreateInvoiceRequest request) {
    UUID companyId = TenantContext.getTenantId();
    return invoiceGenerationService.createManualInvoice(companyId, request);
  }

  @PostMapping("/{id}/cancel")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Cancel an invoice and notify the provider")
  public InvoiceResponse cancel(
      @PathVariable UUID id,
      @Valid @RequestBody CancelInvoiceRequest request) {
    UUID companyId = TenantContext.getTenantId();
    return invoiceGenerationService.cancelInvoice(id, companyId, request.getReason());
  }

  @GetMapping("/{id}/pdf")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','AUDITOR')")
  @Operation(summary = "Download invoice PDF from provider")
  public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID id) {
    UUID companyId = TenantContext.getTenantId();
    byte[] pdfContent = invoiceQueryService.getInvoicePdf(id, companyId);
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoice-" + id + ".pdf\"")
        .body(pdfContent);
  }
}
