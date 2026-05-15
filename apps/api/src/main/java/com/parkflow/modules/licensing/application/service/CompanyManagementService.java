package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.CompanyManagementUseCase;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicenseAuditLog;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicenseAuditLogPort;
import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyManagementService implements CompanyManagementUseCase {

    private final CompanyPort companyRepository;
    private final LicenseAuditLogPort auditLogRepository;
    private final LicenseModuleProvisioner moduleProvisioner;
    private final CompanyResponseAssembler companyResponseAssembler;

    @Override
    @Transactional
    public CompanyResponse createCompany(CreateCompanyRequest request, String performedBy) {
        if (request.getNit() != null && companyRepository.existsByNit(request.getNit())) {
            throw new IllegalArgumentException("Ya existe una empresa con ese NIT");
        }

        Company company = new Company();
        company.setName(request.getName());
        company.setNit(request.getNit());
        company.setAddress(request.getAddress());
        company.setCity(request.getCity());
        company.setPhone(request.getPhone());
        company.setEmail(request.getEmail());
        company.setContactName(request.getContactName());
        company.setPlan(request.getPlan());
        company.setMaxDevices(request.getMaxDevices());
        company.setMaxLocations(request.getMaxLocations());
        company.setMaxUsers(request.getMaxUsers());
        company.setOfflineModeAllowed(request.getOfflineModeAllowed());

        if (request.getTrialDays() != null && request.getTrialDays() > 0) {
            company.setStatus(CompanyStatus.TRIAL);
            company.setTrialStartedAt(OffsetDateTime.now());
            company.setTrialDays(request.getTrialDays());
            company.setExpiresAt(OffsetDateTime.now().plusDays(request.getTrialDays()));
        } else {
            company.setStatus(CompanyStatus.ACTIVE);
            company.setExpiresAt(OffsetDateTime.now().plusYears(1));
        }

        if (company.getExpiresAt() != null) {
            company.setGraceUntil(company.getExpiresAt().plusDays(7));
        }

        company = companyRepository.save(company);
        moduleProvisioner.createDefaultModules(company);

        auditLogRepository.save(LicenseAuditLog.create(
                company, "COMPANY_CREATED",
                "Empresa creada con plan " + request.getPlan(),
                performedBy));

        return companyResponseAssembler.assemble(company);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyResponse getCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));
        return companyResponseAssembler.assemble(company);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponse> listAllCompanies() {
        return companyRepository.findAll().stream()
                .map(companyResponseAssembler::assemble)
                .toList();
    }

    @Override
    @Transactional
    public CompanyResponse updateCompany(UUID companyId, UpdateCompanyRequest request, String performedBy) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

        String oldValues = String.format("plan=%s, status=%s", company.getPlan(), company.getStatus());

        if (request.getName() != null) company.setName(request.getName());
        if (request.getNit() != null) company.setNit(request.getNit());
        if (request.getAddress() != null) company.setAddress(request.getAddress());
        if (request.getCity() != null) company.setCity(request.getCity());
        if (request.getPhone() != null) company.setPhone(request.getPhone());
        if (request.getEmail() != null) company.setEmail(request.getEmail());
        if (request.getContactName() != null) company.setContactName(request.getContactName());
        if (request.getPlan() != null) company.setPlan(request.getPlan());
        if (request.getStatus() != null) company.setStatus(request.getStatus());
        if (request.getMaxDevices() != null) company.setMaxDevices(request.getMaxDevices());
        if (request.getMaxLocations() != null) company.setMaxLocations(request.getMaxLocations());
        if (request.getMaxUsers() != null) company.setMaxUsers(request.getMaxUsers());
        if (request.getOfflineModeAllowed() != null) company.setOfflineModeAllowed(request.getOfflineModeAllowed());
        if (request.getOfflineLeaseHours() != null) company.setOfflineLeaseHours(request.getOfflineLeaseHours());
        if (request.getCustomerMessage() != null) company.setCustomerMessage(request.getCustomerMessage());
        if (request.getAdminNotes() != null) company.setAdminNotes(request.getAdminNotes());

        company = companyRepository.save(company);

        String newValues = String.format("plan=%s, status=%s", company.getPlan(), company.getStatus());

        LicenseAuditLog log = LicenseAuditLog.create(company, "COMPANY_UPDATED",
                "Empresa actualizada", performedBy);
        log.setOldValue(oldValues);
        log.setNewValue(newValues);
        auditLogRepository.save(log);

        return companyResponseAssembler.assemble(company);
    }
}
