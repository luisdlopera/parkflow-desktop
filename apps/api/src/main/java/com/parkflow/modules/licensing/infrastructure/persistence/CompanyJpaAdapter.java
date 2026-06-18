package com.parkflow.modules.licensing.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Component
@RequiredArgsConstructor
public class CompanyJpaAdapter implements CompanyPort {

    private final CompanyJpaRepository jpaRepository;

    @Override
    public boolean existsByNit(String nit) {
        return jpaRepository.existsByNit(nit);
    }

    @Override
    public boolean existsByName(String name) {
        return jpaRepository.existsByNameIgnoreCase(name);
    }

    @Override
    @CacheEvict(value = "companies", key = "#company.id")
    public Company save(Company company) {
        return jpaRepository.save(company);
    }

    @Override
    @Cacheable(value = "companies", key = "#id")
    public Optional<Company> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Company> findAll() {
        return jpaRepository.findAll();
    }

    @Override
    public List<Company> findByStatusNot(CompanyStatus status) {
        return jpaRepository.findByStatusNot(status);
    }

    @Override
    public Page<Company> findAll(Pageable pageable) {
        return jpaRepository.findAll(pageable);
    }

    @Override
    public List<Company> findByNameContainingIgnoreCase(String name) {
        return jpaRepository.findByNameContainingIgnoreCase(name);
    }

    @Override
    public List<Company> findByStatus(CompanyStatus status) {
        return jpaRepository.findByStatus(status);
    }

    @Override
    public List<Company> findByPlan(PlanType plan) {
        return jpaRepository.findByPlan(plan);
    }

    @Override
    @CacheEvict(value = "companies", key = "#id")
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public void deleteAll() {
        jpaRepository.deleteAll();
    }

    @Repository
    interface CompanyJpaRepository extends JpaRepository<Company, UUID> {
        boolean existsByNit(String nit);
        boolean existsByNameIgnoreCase(String name);
        List<Company> findByNameContainingIgnoreCase(String name);
        List<Company> findByStatus(CompanyStatus status);
        List<Company> findByStatusNot(CompanyStatus status);
        List<Company> findByPlan(PlanType plan);
    }
}
