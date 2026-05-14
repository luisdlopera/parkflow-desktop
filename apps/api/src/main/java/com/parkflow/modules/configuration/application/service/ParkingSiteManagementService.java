package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.application.port.in.ParkingSiteUseCase;
import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import com.parkflow.modules.configuration.dto.ParkingSiteResponse;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.repository.CompanyRepository;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParkingSiteManagementService implements ParkingSiteUseCase {

  private final ParkingSiteRepository parkingSiteRepository;
  private final CompanyRepository companyRepository;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<ParkingSiteResponse> list(UUID companyId, String q, Boolean active, Pageable pageable) {
    Page<ParkingSite> page = parkingSiteRepository.search(companyId, normalizeQuery(q), active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public ParkingSiteResponse get(UUID id) {
    return toResponse(findById(id));
  }

  @Override
  @Transactional
  public ParkingSiteResponse create(UUID companyId, ParkingSiteRequest req) {
    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Empresa no encontrada"));
    String code = req.code().trim().toUpperCase();

    if (parkingSiteRepository.existsByCode(code)) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe una sede con este código");
    }

    ParkingSite site = new ParkingSite();
    site.setCompany(company);
    site.setCode(code);
    site.setName(req.name().trim());
    site.setAddress(trimToNull(req.address()));
    site.setCity(trimToNull(req.city()));
    site.setPhone(trimToNull(req.phone()));
    site.setManagerName(trimToNull(req.managerName()));
    site.setTimezone(req.timezone());
    site.setCurrency(req.currency());
    site.setMaxCapacity(req.maxCapacity() != null ? req.maxCapacity() : 0);
    site.setActive(req.isActive());
    site.setCreatedAt(OffsetDateTime.now());
    site.setUpdatedAt(OffsetDateTime.now());

    try {
      site = parkingSiteRepository.save(site);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Código de sede duplicado");
    }
    return toResponse(site);
  }

  @Override
  @Transactional
  public ParkingSiteResponse update(UUID id, ParkingSiteRequest req) {
    ParkingSite site = findById(id);
    String code = req.code().trim().toUpperCase();

    if (!site.getCode().equalsIgnoreCase(code) && parkingSiteRepository.existsByCode(code)) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe una sede con este código");
    }

    site.setCode(code);
    site.setName(req.name().trim());
    site.setAddress(trimToNull(req.address()));
    site.setCity(trimToNull(req.city()));
    site.setPhone(trimToNull(req.phone()));
    site.setManagerName(trimToNull(req.managerName()));
    site.setTimezone(req.timezone());
    site.setCurrency(req.currency());
    site.setMaxCapacity(req.maxCapacity() != null ? req.maxCapacity() : 0);
    site.setActive(req.isActive());

    try {
      site = parkingSiteRepository.save(site);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Código de sede duplicado");
    }
    return toResponse(site);
  }

  @Override
  @Transactional
  public ParkingSiteResponse patchStatus(UUID id, boolean active) {
    ParkingSite site = findById(id);
    site.setActive(active);
    return toResponse(parkingSiteRepository.save(site));
  }

  private ParkingSite findById(UUID id) {
    return parkingSiteRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
  }

  private ParkingSiteResponse toResponse(ParkingSite s) {
    return new ParkingSiteResponse(
        s.getId(),
        s.getCompany().getId(),
        s.getCode(),
        s.getName(),
        s.getAddress(),
        s.getCity(),
        s.getPhone(),
        s.getManagerName(),
        s.getTimezone(),
        s.getCurrency(),
        s.getMaxCapacity(),
        s.isActive(),
        s.getCreatedAt(),
        s.getUpdatedAt());
  }

  private static String trimToNull(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }

  private static String normalizeQuery(String q) {
    return q == null || q.isBlank() ? null : q.trim();
  }
}
