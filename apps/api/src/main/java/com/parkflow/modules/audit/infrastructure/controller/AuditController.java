package com.parkflow.modules.audit.infrastructure.controller;

import com.parkflow.modules.audit.application.port.in.AuditQueryUseCase;
import com.parkflow.modules.audit.application.port.in.AuditExportUseCase;
import com.parkflow.modules.audit.domain.AuditEvent;
import org.springframework.data.domain.Page;
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
public class AuditController {

    private final AuditQueryUseCase auditQueryService;
    private final AuditExportUseCase auditExportService;

    public AuditController(AuditQueryUseCase auditQueryService, AuditExportUseCase auditExportService) {
        this.auditQueryService = auditQueryService;
        this.auditExportService = auditExportService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    public ResponseEntity<Page<AuditEvent>> getAuditEvents(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @PageableDefault(size = 20, sort = "timestampUtc", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        
        Page<AuditEvent> events = auditQueryService.getAuditEvents(module, action, userId, startDate, endDate, pageable);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    public ResponseEntity<AuditEvent> getAuditEventDetails(@PathVariable UUID id) {
        AuditEvent event = auditQueryService.getAuditEventDetails(id);
        return ResponseEntity.ok(event);
    }

    @GetMapping("/{id}/validate")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    public ResponseEntity<Boolean> validateIntegrity(@PathVariable UUID id) {
        boolean isValid = auditQueryService.validateIntegrity(id);
        return ResponseEntity.ok(isValid);
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('AUDITOR')")
    public ResponseEntity<byte[]> exportAuditEvents(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        
        // Use an unpaged request or large page to export. Let's fetch top 10000.
        Pageable exportPageable = org.springframework.data.domain.PageRequest.of(0, 10000, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "timestampUtc"));
        Page<AuditEvent> eventsPage = auditQueryService.getAuditEvents(module, action, userId, startDate, endDate, exportPageable);
        java.util.List<AuditEvent> events = eventsPage.getContent();

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
