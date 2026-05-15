package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.CompanyModule;
import com.parkflow.modules.licensing.enums.ModuleType;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.domain.repository.CompanyModulePort;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LicenseModuleProvisioner {

  private final CompanyModulePort moduleRepository;

  public void createDefaultModules(Company company) {
    moduleRepository.saveAll(defaultModulesFor(company));
  }

  public List<String> enabledModuleNames(UUID companyId) {
    return moduleRepository.findByCompanyIdAndEnabled(companyId, true).stream()
        .filter(CompanyModule::isActive)
        .map(module -> module.getModuleType().name())
        .toList();
  }

  private List<CompanyModule> defaultModulesFor(Company company) {
    List<CompanyModule> modules = new ArrayList<>();
    modules.add(createModule(company, ModuleType.LOCAL_PRINTING, true));

    if (company.getPlan() == PlanType.SYNC
        || company.getPlan() == PlanType.PRO
        || company.getPlan() == PlanType.ENTERPRISE) {
      modules.add(createModule(company, ModuleType.CLOUD_SYNC, true));
      modules.add(createModule(company, ModuleType.DASHBOARD, true));
      modules.add(createModule(company, ModuleType.CLOUD_BACKUP, true));
    }

    if (company.getPlan() == PlanType.PRO || company.getPlan() == PlanType.ENTERPRISE) {
      modules.add(createModule(company, ModuleType.MULTI_LOCATION, true));
      modules.add(createModule(company, ModuleType.ADVANCED_AUDIT, true));
      modules.add(createModule(company, ModuleType.CUSTOM_REPORTS, true));
    }

    return modules;
  }

  private CompanyModule createModule(Company company, ModuleType type, boolean enabled) {
    CompanyModule module = new CompanyModule();
    module.setCompany(company);
    module.setModuleType(type);
    module.setEnabled(enabled);
    return module;
  }
}
