package com.parkflow.modules.audit.infrastructure;

import com.parkflow.modules.audit.application.AuditQueryService;
import com.parkflow.modules.audit.domain.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audits")
public class AuditController {

    private final AuditQueryService auditQueryService;

    public AuditController(AuditQueryService auditQueryService) {
        this.auditQueryService = auditQueryService;
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
}
