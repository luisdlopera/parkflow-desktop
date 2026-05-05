package com.parkflow.modules.configuration.service;

import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.configuration.dto.CashRegisterRequest;
import com.parkflow.modules.configuration.dto.CashRegisterResponse;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.entity.Printer;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.repository.PrinterRepository;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CashRegisterConfigurationService {

  private final CashRegisterRepository cashRegisterRepository;
  private final ParkingSiteRepository parkingSiteRepository;
  private final PrinterRepository printerRepository;
  private final AppUserRepository appUserRepository;

  @Transactional(readOnly = true)
  public SettingsPageResponse<CashRegisterResponse> list(
      UUID siteId, String q, Boolean active, Pageable pageable) {
    // Use repository search if available, otherwise filter in memory
    Page<CashRegister> page;
    if (siteId != null) {
      page = cashRegisterRepository.findBySiteRef_Id(siteId, pageable);
    } else {
      page = cashRegisterRepository.findAll(pageable);
    }
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public CashRegisterResponse get(UUID id) {
    return toResponse(findById(id));
  }

  @Transactional
  public CashRegisterResponse create(CashRegisterRequest req) {
    CashRegister cr = new CashRegister();
    cr.setSite(req.site());
    if (req.siteId() != null) {
      ParkingSite site = parkingSiteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      cr.setSiteRef(site);
    }
    cr.setCode(req.code().trim().toUpperCase());
    cr.setName(req.name());
    cr.setTerminal(req.terminal().trim());
    cr.setLabel(req.label());
    if (req.printerId() != null) {
      Printer p = printerRepository.findById(req.printerId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Impresora no encontrada"));
      cr.setPrinter(p);
    }
    if (req.responsibleUserId() != null) {
      AppUser u = appUserRepository.findById(req.responsibleUserId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
      cr.setResponsibleUser(u);
    }
    cr.setActive(req.active());
    cr.setCreatedAt(OffsetDateTime.now());
    cr.setUpdatedAt(OffsetDateTime.now());
    cr = cashRegisterRepository.save(cr);
    return toResponse(cr);
  }

  @Transactional
  public CashRegisterResponse update(UUID id, CashRegisterRequest req) {
    CashRegister cr = findById(id);
    cr.setSite(req.site());
    if (req.siteId() != null) {
      ParkingSite site = parkingSiteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      cr.setSiteRef(site);
    }
    cr.setCode(req.code().trim().toUpperCase());
    cr.setName(req.name());
    cr.setTerminal(req.terminal().trim());
    cr.setLabel(req.label());
    if (req.printerId() != null) {
      Printer p = printerRepository.findById(req.printerId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Impresora no encontrada"));
      cr.setPrinter(p);
    } else {
      cr.setPrinter(null);
    }
    if (req.responsibleUserId() != null) {
      AppUser u = appUserRepository.findById(req.responsibleUserId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
      cr.setResponsibleUser(u);
    } else {
      cr.setResponsibleUser(null);
    }
    cr.setActive(req.active());
    cr = cashRegisterRepository.save(cr);
    return toResponse(cr);
  }

  @Transactional
  public CashRegisterResponse patchStatus(UUID id, boolean active) {
    CashRegister cr = findById(id);
    cr.setActive(active);
    return toResponse(cashRegisterRepository.save(cr));
  }

  private CashRegister findById(UUID id) {
    return cashRegisterRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Caja no encontrada"));
  }

  private CashRegisterResponse toResponse(CashRegister cr) {
    return new CashRegisterResponse(
        cr.getId(), cr.getSite(),
        cr.getSiteRef() != null ? cr.getSiteRef().getId() : null,
        cr.getCode(), cr.getName(), cr.getTerminal(), cr.getLabel(),
        cr.getPrinter() != null ? cr.getPrinter().getId() : null,
        cr.getPrinter() != null ? cr.getPrinter().getName() : null,
        cr.getResponsibleUser() != null ? cr.getResponsibleUser().getId() : null,
        cr.getResponsibleUser() != null ? cr.getResponsibleUser().getName() : null,
        cr.isActive(), cr.getCreatedAt(), cr.getUpdatedAt());
  }
}
