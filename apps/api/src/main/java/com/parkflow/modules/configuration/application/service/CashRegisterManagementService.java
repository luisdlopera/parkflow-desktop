package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.repository.CashRegisterPort;
import com.parkflow.modules.configuration.application.port.in.CashRegisterUseCase;
import com.parkflow.modules.configuration.dto.CashRegisterRequest;
import com.parkflow.modules.configuration.dto.CashRegisterResponse;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.Printer;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.PrinterPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
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
public class CashRegisterManagementService implements CashRegisterUseCase {

  private final CashRegisterPort cashRegisterRepository;
  private final ParkingSitePort parkingSiteRepository;
  private final PrinterPort printerRepository;
  private final AppUserPort appUserRepository;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<CashRegisterResponse> list(UUID siteId, String q, Boolean active, Pageable pageable) {
    Page<CashRegister> page = cashRegisterRepository.search(siteId, normalizeQuery(q), active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public CashRegisterResponse get(UUID id) {
    return toResponse(findById(id));
  }

  @Override
  @Transactional
  public CashRegisterResponse create(CashRegisterRequest req) {
    String site = normalizeSite(req.site());
    String terminal = normalizeTerminal(req.terminal());

    CashRegister cr = new CashRegister();
    ParkingSite parkingSite = null;
    if (req.siteId() != null) {
      parkingSite = parkingSiteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      cr.setSiteRef(parkingSite);
    }
    cr.setSite(resolveSite(site, parkingSite));
    ensureUniqueCombination(cr.getSite(), terminal, null);
    cr.setCode(normalizeCode(req.code()));
    cr.setName(trimToNull(req.name()));
    cr.setTerminal(terminal);
    cr.setLabel(trimToNull(req.label()));
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

  @Override
  @Transactional
  public CashRegisterResponse update(UUID id, CashRegisterRequest req) {
    CashRegister cr = findById(id);
    String site = normalizeSite(req.site());
    String terminal = normalizeTerminal(req.terminal());

    ParkingSite parkingSite = null;
    if (req.siteId() != null) {
      parkingSite = parkingSiteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      cr.setSiteRef(parkingSite);
    } else {
      cr.setSiteRef(null);
    }
    cr.setSite(resolveSite(site, parkingSite));
    ensureUniqueCombination(cr.getSite(), terminal, id);
    cr.setCode(normalizeCode(req.code()));
    cr.setName(trimToNull(req.name()));
    cr.setTerminal(terminal);
    cr.setLabel(trimToNull(req.label()));
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

  @Override
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

  private void ensureUniqueCombination(String site, String terminal, UUID currentId) {
    cashRegisterRepository.findBySiteAndTerminal(site, terminal).ifPresent(existing -> {
      if (currentId == null || !currentId.equals(existing.getId())) {
        throw new OperationException(HttpStatus.CONFLICT, "Ya existe una caja para esta sede y terminal");
      }
    });
  }

  private static String normalizeSite(String site) {
    return StringUtils.hasText(site) ? site.trim() : "default";
  }

  private static String resolveSite(String fallbackSite, ParkingSite parkingSite) {
    return parkingSite != null && StringUtils.hasText(parkingSite.getCode())
        ? parkingSite.getCode().trim()
        : fallbackSite;
  }

  private static String normalizeTerminal(String terminal) {
    if (!StringUtils.hasText(terminal)) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La terminal es obligatoria");
    }
    return terminal.trim();
  }

  private static String normalizeCode(String code) {
    if (!StringUtils.hasText(code)) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El código es obligatorio");
    }
    return code.trim().toUpperCase();
  }

  private static String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private static String normalizeQuery(String q) {
    return StringUtils.hasText(q) ? q.trim() : null;
  }
}
