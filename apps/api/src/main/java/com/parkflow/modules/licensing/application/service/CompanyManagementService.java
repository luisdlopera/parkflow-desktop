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
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyManagementService implements CompanyManagementUseCase {

    private final CompanyPort companyRepository;
    private final LicenseAuditLogPort auditLogRepository;
    private final LicenseModuleProvisioner moduleProvisioner;
    private final CompanyResponseAssembler companyResponseAssembler;
    private final AppUserRepository appUserRepository;
    private final PasswordHashService passwordHashService;
    private final AuthSessionPort authSessionPort;

    @Override
    @Transactional
    public CompanyResponse createCompany(CreateCompanyRequest request, String performedBy) {
        String nit = request.getNit() != null && !request.getNit().isBlank() ? request.getNit() : null;
        if (nit != null && companyRepository.existsByNit(nit)) {
            throw new BusinessValidationException("COMPANY_ALREADY_EXISTS", "Ya existe una empresa con ese NIT");
        }
        if (companyRepository.existsByName(request.getName())) {
            throw new BusinessValidationException("COMPANY_ALREADY_EXISTS", "Ya existe una empresa con ese nombre");
        }

        Company company = new Company();
        company.setName(request.getName());
        company.setNit(nit);
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

        // Generar las credenciales iniciales para el administrador de la empresa (MVP requirement)
        String adminEmail = company.getEmail() != null ? company.getEmail() : performedBy;
        if (appUserRepository.existsByEmail(adminEmail)) {
            throw new BusinessValidationException("USER_EMAIL_ALREADY_EXISTS",
                "El correo electrónico " + adminEmail + " ya está registrado como usuario. Use un email diferente para la empresa.");
        }
        String rawPassword = generateRandomPassword();
        AppUser adminUser = new AppUser();
        adminUser.setCompanyId(company.getId());
        adminUser.setEmail(adminEmail);
        adminUser.setName(company.getContactName() != null && !company.getContactName().isBlank() ? company.getContactName() : "Administrador");
        adminUser.setRole(UserRole.ADMIN);
        adminUser.setPasswordHash(passwordHashService.encodePassword(rawPassword));
        adminUser.setRequirePasswordChange(true);
        adminUser.setActive(true);
        appUserRepository.save(adminUser);

        auditLogRepository.save(LicenseAuditLog.create(
                company, "COMPANY_CREATED",
                "Empresa creada con plan " + request.getPlan(),
                performedBy));

        CompanyResponse response = companyResponseAssembler.assemble(company);
        response.setAdminPassword(rawPassword);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyResponse getCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new EntityNotFoundException("Company", companyId.toString()));
        return companyResponseAssembler.assemble(company);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponse> listAllCompanies() {
        return companyRepository.findByStatusNot(CompanyStatus.CANCELLED).stream()
                .map(companyResponseAssembler::assemble)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CompanyResponse> listAllCompaniesPaginated(Pageable pageable) {
        return companyRepository.findAll(pageable)
                .map(companyResponseAssembler::assemble);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponse> searchCompanies(String query) {
        return companyRepository.findByNameContainingIgnoreCase(query).stream()
                .map(companyResponseAssembler::assemble)
                .toList();
    }

    @Override
    @Transactional
    public CompanyResponse updateCompany(UUID companyId, UpdateCompanyRequest request, String performedBy) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new EntityNotFoundException("Company", companyId.toString()));

        String oldValues = String.format("plan=%s, status=%s", company.getPlan(), company.getStatus());

        if (request.getName() != null) {
            if (!request.getName().equals(company.getName()) && companyRepository.existsByName(request.getName())) {
                throw new BusinessValidationException("COMPANY_ALREADY_EXISTS", "Ya existe una empresa con ese nombre");
            }
            company.setName(request.getName());
        }
        if (request.getNit() != null) {
            String nit = request.getNit().isBlank() ? null : request.getNit();
            if (nit != null && !nit.equals(company.getNit()) && companyRepository.existsByNit(nit)) {
                throw new BusinessValidationException("COMPANY_ALREADY_EXISTS", "Ya existe una empresa con ese NIT");
            }
            company.setNit(nit);
        }
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

    @Override
    @Transactional
    public void deactivateCompany(UUID companyId, String performedBy) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new EntityNotFoundException("Company", companyId.toString()));
        
        company.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.CANCELLED);
        company.setCancelledAt(OffsetDateTime.now());
        companyRepository.save(company);
        
        List<AppUser> users = appUserRepository.findByCompanyId(companyId);
        users.forEach(u -> u.setActive(false));
        appUserRepository.saveAll(users);
        
        LicenseAuditLog audit = LicenseAuditLog.create(company, "COMPANY_DEACTIVATED",
                "Empresa y sus usuarios desactivados", performedBy);
        auditLogRepository.save(audit);
        
        log.info("Compañía {} ({}) desactivada por {}", company.getName(), companyId, performedBy);
    }

    @Override
    @Transactional
    public void deleteCompany(UUID companyId, String performedBy) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new EntityNotFoundException("Company", companyId.toString()));
        
        log.info("Iniciando soft delete (cancelación) de compañía {} ({}) por {}", company.getName(), companyId, performedBy);
        
        // Bloquear acceso de usuarios asociados eliminando sus sesiones activas
        List<AppUser> users = appUserRepository.findByCompanyId(companyId);
        
        // Evitar que el SuperAdmin que realiza la acción se auto-cierre la sesión
        List<AppUser> usersToDeleteSessions = users.stream()
                .filter(u -> !u.getEmail().equalsIgnoreCase(performedBy))
                .toList();
                
        if (!usersToDeleteSessions.isEmpty()) {
            authSessionPort.deleteByUserIn(usersToDeleteSessions);
        }
        
        // Soft Delete: Marcar la empresa como CANCELLED
        company.setStatus(CompanyStatus.CANCELLED);
        companyRepository.save(company);
        
        // Registrar la acción en los logs de auditoría
        auditLogRepository.save(
            LicenseAuditLog.create(
                company,
                "COMPANY_SOFT_DELETED",
                "La empresa fue marcada como cancelada a través del proceso de eliminación.",
                performedBy
            )
        );
        
        log.info("Compañía {} marcada como cancelada (Soft Delete)", companyId);
    }

    @Override
    @Transactional
    public void purgeCompany(UUID companyId, String performedBy) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new EntityNotFoundException("Company", companyId.toString()));
        
        log.warn("Iniciando purga (Hard Delete) de compañía {} ({}) por {}", company.getName(), companyId, performedBy);
        
        List<AppUser> users = appUserRepository.findByCompanyId(companyId);
        if (!users.isEmpty()) {
            authSessionPort.deleteByUserIn(users);
            appUserRepository.deleteAll(users);
        }
        
        companyRepository.deleteById(companyId);
        log.info("Compañía {} eliminada físicamente (Purge) de la base de datos", companyId);
    }

    private String generateRandomPassword() {
        String upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lower = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String special = "@#$%&!.";
        String all = upper + lower + digits + special;
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(14);
        // Garantizar al menos uno de cada tipo
        password.append(upper.charAt(random.nextInt(upper.length())));
        password.append(lower.charAt(random.nextInt(lower.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(special.charAt(random.nextInt(special.length())));
        for (int i = 4; i < 14; i++) {
            password.append(all.charAt(random.nextInt(all.length())));
        }
        // Mezclar caracteres
        char[] chars = password.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }
        return new String(chars);
    }
}
