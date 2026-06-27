package com.parkflow.modules.audit.application.port.in;

import com.parkflow.modules.audit.domain.AuditEvent;

import java.util.List;

public interface AuditExportUseCase {
    byte[] exportToCsv(List<AuditEvent> events) throws Exception;
    byte[] exportToExcel(List<AuditEvent> events) throws Exception;
    byte[] exportToPdf(List<AuditEvent> events) throws Exception;
}
