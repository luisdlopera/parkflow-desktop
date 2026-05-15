package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.application.port.in.PrinterUseCase;
import com.parkflow.modules.configuration.dto.PrinterRequest;
import com.parkflow.modules.configuration.dto.PrinterResponse;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.Printer;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.PrinterPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrinterManagementService implements PrinterUseCase {

  private final PrinterPort printerRepository;
  private final ParkingSitePort parkingSiteRepository;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<PrinterResponse> list(UUID siteId, String q, Boolean active, Pageable pageable) {
    Page<Printer> page = printerRepository.search(siteId, normalizeQuery(q), active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public PrinterResponse get(UUID id) {
    return toResponse(findById(id));
  }

  @Override
  @Transactional
  public PrinterResponse create(UUID siteId, PrinterRequest req) {
    ParkingSite site = parkingSiteRepository.findById(siteId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));

    Printer printer = new Printer();
    printer.setSite(site);
    printer.setName(req.name().trim());
    printer.setType(req.type());
    printer.setConnection(req.connection());
    printer.setPaperWidthMm(req.paperWidthMm());
    printer.setEndpointOrDevice(trimToNull(req.endpointOrDevice()));
    printer.setActive(req.isActive());
    printer.setDefault(req.isDefault());
    printer.setCreatedAt(OffsetDateTime.now());
    printer.setUpdatedAt(OffsetDateTime.now());

    if (req.isDefault()) {
      unsetPreviousDefault(siteId);
    }

    printer = printerRepository.save(printer);
    return toResponse(printer);
  }

  @Override
  @Transactional
  public PrinterResponse update(UUID id, PrinterRequest req) {
    Printer printer = findById(id);
    printer.setName(req.name().trim());
    printer.setType(req.type());
    printer.setConnection(req.connection());
    printer.setPaperWidthMm(req.paperWidthMm());
    printer.setEndpointOrDevice(trimToNull(req.endpointOrDevice()));
    printer.setActive(req.isActive());

    if (req.isDefault() && !printer.isDefault()) {
      unsetPreviousDefault(printer.getSite().getId());
    }
    printer.setDefault(req.isDefault());

    printer = printerRepository.save(printer);
    return toResponse(printer);
  }

  @Override
  @Transactional
  public PrinterResponse patchStatus(UUID id, boolean active) {
    Printer printer = findById(id);
    printer.setActive(active);
    return toResponse(printerRepository.save(printer));
  }

  private void unsetPreviousDefault(UUID siteId) {
    printerRepository.findBySite_IdAndIsDefaultTrue(siteId)
        .ifPresent(p -> { p.setDefault(false); printerRepository.save(p); });
  }

  private Printer findById(UUID id) {
    return printerRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Impresora no encontrada"));
  }

  private PrinterResponse toResponse(Printer p) {
    return new PrinterResponse(
        p.getId(), p.getSite().getId(), p.getName(), p.getType(), p.getConnection(),
        p.getPaperWidthMm(), p.getEndpointOrDevice(), p.isActive(), p.isDefault(),
        p.getCreatedAt(), p.getUpdatedAt());
  }

  private static String trimToNull(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }

  private static String normalizeQuery(String q) {
    return StringUtils.hasText(q) ? q.trim() : null;
  }
}
