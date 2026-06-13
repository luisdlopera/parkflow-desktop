package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CompanyPort {
    boolean existsByNit(String nit);
    boolean existsByName(String name);
    Company save(Company company);
    Optional<Company> findById(UUID id);
    List<Company> findAll();
    List<Company> findByStatusNot(CompanyStatus status);
    Page<Company> findAll(Pageable pageable);
    List<Company> findByNameContainingIgnoreCase(String name);
    List<Company> findByStatus(CompanyStatus status);
    List<Company> findByPlan(PlanType plan);
    void deleteById(UUID id);
    void deleteAll();
}
