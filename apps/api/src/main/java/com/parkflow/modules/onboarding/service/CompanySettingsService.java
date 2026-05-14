package com.parkflow.modules.onboarding.service;

import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.onboarding.entity.CompanySettings;
import com.parkflow.modules.onboarding.repository.CompanySettingsRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanySettingsService {

  private final CompanySettingsRepository companySettingsRepository;

  @Transactional(readOnly = true)
  public Map<String, Object> getSettingsOrDefault(Company company) {
    return companySettingsRepository.findByCompanyId(company.getId())
        .map(CompanySettings::getSettingsJson)
        .orElseGet(this::defaultSettings);
  }

  @Transactional
  public Map<String, Object> upsertSettings(Company company, Map<String, Object> settings) {
    CompanySettings row = companySettingsRepository.findByCompanyId(company.getId())
        .orElseGet(() -> {
          CompanySettings created = new CompanySettings();
          created.setCompany(company);
          created.setCreatedAt(OffsetDateTime.now());
          return created;
        });
    row.setSettingsJson(new LinkedHashMap<>(settings));
    row.setUpdatedAt(OffsetDateTime.now());
    companySettingsRepository.save(row);
    return row.getSettingsJson();
  }

  private Map<String, Object> defaultSettings() {
    return Map.of(
        "vehicleTypes", List.of("MOTO", "CARRO"),
        "capacity", Map.of("controlSlots", false, "total", 0),
        "rates", Map.of("mode", "HOURLY", "baseValue", 0),
        "paymentMethods", List.of("EFECTIVO"),
        "sites", List.of("PRINCIPAL"),
        "modules", Map.of(
            "cash", true,
            "shifts", false,
            "clients", false,
            "monthly", false,
            "agreements", false,
            "advancedAudit", true));
  }
}
