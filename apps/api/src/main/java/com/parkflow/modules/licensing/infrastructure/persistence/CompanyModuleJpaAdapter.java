package com.parkflow.modules.licensing.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.CompanyModule;
import com.parkflow.modules.licensing.domain.repository.CompanyModulePort;
import com.parkflow.modules.licensing.enums.ModuleType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CompanyModuleJpaAdapter implements CompanyModulePort {

    private final CompanyModuleJpaRepository jpaRepository;

    @Override
    public List<CompanyModule> findByCompany(Company company) {
        return jpaRepository.findByCompany(company);
    }

    @Override
    public List<CompanyModule> findByCompanyId(UUID companyId) {
        return jpaRepository.findByCompanyId(companyId);
    }

    @Override
    public Optional<CompanyModule> findByCompanyAndModuleType(Company company, ModuleType moduleType) {
        return jpaRepository.findByCompanyAndModuleType(company, moduleType);
    }

    @Override
    public Optional<CompanyModule> findByCompanyIdAndModuleType(UUID companyId, ModuleType moduleType) {
        return jpaRepository.findByCompanyIdAndModuleType(companyId, moduleType);
    }

    @Override
    public List<CompanyModule> findByCompanyIdAndEnabled(UUID companyId, Boolean enabled) {
        return jpaRepository.findByCompanyIdAndEnabled(companyId, enabled);
    }

    @Override
    public boolean existsByCompanyAndModuleType(Company company, ModuleType moduleType) {
        return jpaRepository.existsByCompanyAndModuleType(company, moduleType);
    }

    @Override
    public CompanyModule save(CompanyModule module) {
        return jpaRepository.save(module);
    }

    @Override
    public List<CompanyModule> saveAll(Iterable<CompanyModule> modules) {
        return jpaRepository.saveAll(modules);
    }

    @Override
    public void delete(CompanyModule module) {
        jpaRepository.delete(module);
    }

    @Override
    public void deleteAll() {
        jpaRepository.deleteAll();
    }

    @Repository
    interface CompanyModuleJpaRepository extends JpaRepository<CompanyModule, UUID> {
        List<CompanyModule> findByCompany(Company company);
        List<CompanyModule> findByCompanyId(UUID companyId);
        Optional<CompanyModule> findByCompanyAndModuleType(Company company, ModuleType moduleType);
        Optional<CompanyModule> findByCompanyIdAndModuleType(UUID companyId, ModuleType moduleType);
        List<CompanyModule> findByCompanyIdAndEnabled(UUID companyId, Boolean enabled);
        boolean existsByCompanyAndModuleType(Company company, ModuleType moduleType);
    }
}
