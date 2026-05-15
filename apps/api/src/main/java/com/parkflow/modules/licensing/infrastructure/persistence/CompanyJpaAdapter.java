package com.parkflow.modules.licensing.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CompanyJpaAdapter implements CompanyPort {

    private final CompanyJpaRepository jpaRepository;

    @Override
    public boolean existsByNit(String nit) {
        return jpaRepository.existsByNit(nit);
    }

    @Override
    public Company save(Company company) {
        return jpaRepository.save(company);
    }

    @Override
    public Optional<Company> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Company> findAll() {
        return jpaRepository.findAll();
    }

    @Override
    public void deleteAll() {
        jpaRepository.deleteAll();
    }

    @Repository
    interface CompanyJpaRepository extends JpaRepository<Company, UUID> {
        boolean existsByNit(String nit);
    }
}
