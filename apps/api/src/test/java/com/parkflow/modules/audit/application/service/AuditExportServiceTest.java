package com.parkflow.modules.audit.application.service;

import com.parkflow.modules.audit.domain.AuditEvent;
import org.junit.jupiter.api.Test;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class AuditExportServiceTest {

    private final AuditExportService exportService = new AuditExportService();

    @Test
    void exportToCsv() throws Exception {
        AuditEvent event = AuditEvent.builder()
                .id(UUID.randomUUID())
                .timestampUtc(OffsetDateTime.now())
                .module("OPERACION")
                .action("INGRESO")
                .userId(UUID.randomUUID())
                .branchId(UUID.randomUUID())
                .entityName("ParkingSession")
                .status("EXITOSA")
                .build();

        byte[] csvBytes = exportService.exportToCsv(List.of(event));
        assertNotNull(csvBytes);
        assertTrue(csvBytes.length > 0);
        String csvString = new String(csvBytes);
        assertTrue(csvString.contains("OPERACION"));
        assertTrue(csvString.contains("INGRESO"));
    }

    @Test
    void exportToExcel() throws Exception {
        AuditEvent event = AuditEvent.builder()
                .id(UUID.randomUUID())
                .timestampUtc(OffsetDateTime.now())
                .module("OPERACION")
                .action("SALIDA")
                .status("EXITOSA")
                .build();

        byte[] excelBytes = exportService.exportToExcel(List.of(event));
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 0);
    }

    @Test
    void exportToPdf() throws Exception {
        AuditEvent event = AuditEvent.builder()
                .id(UUID.randomUUID())
                .timestampUtc(OffsetDateTime.now())
                .module("CAJA")
                .action("MOVIMIENTO")
                .status("EXITOSA")
                .build();

        byte[] pdfBytes = exportService.exportToPdf(List.of(event));
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }
}
