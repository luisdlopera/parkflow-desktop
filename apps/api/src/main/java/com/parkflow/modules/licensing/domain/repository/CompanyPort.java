package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.Company;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyPort {
    boolean existsByNit(String nit);
    Company save(Company company);
    Optional<Company> findById(UUID id);
    List<Company> findAll();
    void deleteAll();
}
