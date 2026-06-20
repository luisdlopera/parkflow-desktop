package com.parkflow.modules.audit.application.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.opencsv.CSVWriter;
import com.parkflow.modules.audit.domain.AuditEvent;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class AuditExportService {

  private static final String[] HEADERS = {
      "ID", "Fecha (UTC)", "Módulo", "Acción", "Usuario", "Sucursal", "Entidad", "Estado"
  };

  private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  public byte[] exportToCsv(List<AuditEvent> events) throws Exception {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    try (CSVWriter writer = new CSVWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
      // Add BOM for Excel compatibility
      out.write(0xef);
      out.write(0xbb);
      out.write(0xbf);
      
      writer.writeNext(HEADERS);
      for (AuditEvent event : events) {
        String[] data = {
            event.getId() != null ? event.getId().toString() : "",
            event.getTimestampUtc() != null ? event.getTimestampUtc().format(DATE_FORMATTER) : "",
            event.getModule(),
            event.getAction(),
            event.getUserId() != null ? event.getUserId().toString() : "SISTEMA",
            event.getBranchId() != null ? event.getBranchId().toString() : "GLOBAL",
            event.getEntityName(),
            event.getStatus()
        };
        writer.writeNext(data);
      }
    }
    return out.toByteArray();
  }

  public byte[] exportToExcel(List<AuditEvent> events) throws Exception {
    try (Workbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet("Auditoría");

      Row headerRow = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        headerRow.createCell(i).setCellValue(HEADERS[i]);
      }

      int rowIdx = 1;
      for (AuditEvent event : events) {
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(event.getId() != null ? event.getId().toString() : "");
        row.createCell(1).setCellValue(event.getTimestampUtc() != null ? event.getTimestampUtc().format(DATE_FORMATTER) : "");
        row.createCell(2).setCellValue(event.getModule());
        row.createCell(3).setCellValue(event.getAction());
        row.createCell(4).setCellValue(event.getUserId() != null ? event.getUserId().toString() : "SISTEMA");
        row.createCell(5).setCellValue(event.getBranchId() != null ? event.getBranchId().toString() : "GLOBAL");
        row.createCell(6).setCellValue(event.getEntityName());
        row.createCell(7).setCellValue(event.getStatus());
      }
      
      for (int i = 0; i < HEADERS.length; i++) {
        sheet.autoSizeColumn(i);
      }

      workbook.write(out);
      return out.toByteArray();
    }
  }

  public byte[] exportToPdf(List<AuditEvent> events) throws Exception {
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document document = new Document();
      PdfWriter.getInstance(document, out);
      document.open();

      Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
      Paragraph title = new Paragraph("Reporte de Auditoría", titleFont);
      title.setAlignment(Paragraph.ALIGN_CENTER);
      title.setSpacingAfter(20);
      document.add(title);

      PdfPTable table = new PdfPTable(8);
      table.setWidthPercentage(100);
      table.setSpacingBefore(10f);
      table.setWidths(new float[]{2f, 3f, 2f, 2f, 2f, 2f, 2f, 2f});

      Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
      for (String header : HEADERS) {
        PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
        cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        table.addCell(cell);
      }

      Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
      for (AuditEvent event : events) {
        table.addCell(new Phrase(event.getId() != null ? event.getId().toString().substring(0, 8) + "..." : "", dataFont));
        table.addCell(new Phrase(event.getTimestampUtc() != null ? event.getTimestampUtc().format(DATE_FORMATTER) : "", dataFont));
        table.addCell(new Phrase(event.getModule(), dataFont));
        table.addCell(new Phrase(event.getAction(), dataFont));
        table.addCell(new Phrase(event.getUserId() != null ? event.getUserId().toString().substring(0, 8) + "..." : "SISTEMA", dataFont));
        table.addCell(new Phrase(event.getBranchId() != null ? event.getBranchId().toString().substring(0, 8) + "..." : "GLOBAL", dataFont));
        table.addCell(new Phrase(event.getEntityName() != null ? event.getEntityName() : "", dataFont));
        table.addCell(new Phrase(event.getStatus(), dataFont));
      }

      document.add(table);
      document.close();
      return out.toByteArray();
    }
  }
}
