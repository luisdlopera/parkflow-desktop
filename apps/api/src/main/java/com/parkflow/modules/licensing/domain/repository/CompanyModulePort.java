package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.CompanyModule;
import com.parkflow.modules.licensing.enums.ModuleType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyModulePort {
    List<CompanyModule> findByCompany(Company company);
    List<CompanyModule> findByCompanyId(UUID companyId);
    Optional<CompanyModule> findByCompanyAndModuleType(Company company, ModuleType moduleType);
    Optional<CompanyModule> findByCompanyIdAndModuleType(UUID companyId, ModuleType moduleType);
    List<CompanyModule> findByCompanyIdAndEnabled(UUID companyId, Boolean enabled);
    boolean existsByCompanyAndModuleType(Company company, ModuleType moduleType);
    CompanyModule save(CompanyModule module);
    List<CompanyModule> saveAll(Iterable<CompanyModule> modules);
    void delete(CompanyModule module);
    void deleteAll();
}
