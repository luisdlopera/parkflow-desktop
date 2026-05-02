package com.parkflow.modules.licensing.repository;

import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.entity.CompanyModule;
import com.parkflow.modules.licensing.enums.ModuleType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio para módulos de empresa.
 */
@Repository
public interface CompanyModuleRepository extends JpaRepository<CompanyModule, UUID> {

  List<CompanyModule> findByCompany(Company company);

  List<CompanyModule> findByCompanyId(UUID companyId);

  Optional<CompanyModule> findByCompanyAndModuleType(Company company, ModuleType moduleType);

  Optional<CompanyModule> findByCompanyIdAndModuleType(UUID companyId, ModuleType moduleType);

  List<CompanyModule> findByCompanyIdAndEnabled(UUID companyId, Boolean enabled);

  boolean existsByCompanyAndModuleType(Company company, ModuleType moduleType);
}
