package com.parkflow.modules.audit.infrastructure.controller;

import com.parkflow.modules.audit.application.port.in.AuditQueryUseCase;
import com.parkflow.modules.audit.application.port.in.AuditExportUseCase;
import com.parkflow.modules.audit.domain.AuditEvent;
import com.parkflow.modules.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.parkflow.modules.auth.security.RequireModule;
import com.parkflow.modules.licensing.enums.ModuleType;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audits")
@RequireModule(ModuleType.ADVANCED_AUDIT)
@Tag(name = "Audit Management", description = "System audit trail and event logging")
public class AuditController {

    private final AuditQueryUseCase auditQueryService;
    private final AuditExportUseCase auditExportService;

    public AuditController(AuditQueryUseCase auditQueryService, AuditExportUseCase auditExportService) {
        this.auditQueryService = auditQueryService;
        this.auditExportService = auditExportService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    @Operation(summary = "List audit events", description = "Retrieve audit events with optional filtering by module, action, user, or date range")
    @ApiResponse(responseCode = "200", description = "Events retrieved")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    public PageResponse<AuditEvent> getAuditEvents(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @PageableDefault(size = 20, sort = "timestampUtc", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {

        return auditQueryService.getAuditEvents(module, action, userId, startDate, endDate, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    @Operation(summary = "Get audit event details", description = "Retrieve detailed information about a specific audit event")
    @ApiResponse(responseCode = "200", description = "Event retrieved")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "404", description = "Event not found")
    public AuditEvent getAuditEventDetails(@PathVariable UUID id) {
        return auditQueryService.getAuditEventDetails(id);
    }

    @GetMapping("/{id}/validate")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    @Operation(summary = "Validate event integrity", description = "Verifies the cryptographic integrity of an audit event record")
    @ApiResponse(responseCode = "200", description = "Integrity validated")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "404", description = "Event not found")
    public Boolean validateIntegrity(@PathVariable UUID id) {
        return auditQueryService.validateIntegrity(id);
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    @Operation(summary = "Export audit events", description = "Export filtered audit events as CSV, Excel, or PDF")
    @ApiResponse(responseCode = "200", description = "Export successful")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    public ResponseEntity<byte[]> exportAuditEvents(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        
        // Use an unpaged request or large page to export. Let's fetch top 10000.
        Pageable exportPageable = org.springframework.data.domain.PageRequest.of(0, 10000, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "timestampUtc"));
        PageResponse<AuditEvent> eventsPage = auditQueryService.getAuditEvents(module, action, userId, startDate, endDate, exportPageable);
        java.util.List<AuditEvent> events = eventsPage.content();

        byte[] fileData;
        String contentType;
        String extension;

        if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) {
            fileData = auditExportService.exportToExcel(events);
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            extension = "xlsx";
        } else if ("pdf".equalsIgnoreCase(format)) {
            fileData = auditExportService.exportToPdf(events);
            contentType = "application/pdf";
            extension = "pdf";
        } else {
            fileData = auditExportService.exportToCsv(events);
            contentType = "text/csv";
            extension = "csv";
        }

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"auditoria." + extension + "\"")
                .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                .body(fileData);
    }
}
