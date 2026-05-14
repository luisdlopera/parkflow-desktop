package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.PrinterRequest;
import com.parkflow.modules.configuration.dto.PrinterResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Port for managing printers.
 */
public interface PrinterUseCase {
  SettingsPageResponse<PrinterResponse> list(UUID siteId, String q, Boolean active, Pageable pageable);
  PrinterResponse get(UUID id);
  PrinterResponse create(UUID siteId, PrinterRequest request);
  PrinterResponse update(UUID id, PrinterRequest request);
  PrinterResponse patchStatus(UUID id, boolean active);
}
