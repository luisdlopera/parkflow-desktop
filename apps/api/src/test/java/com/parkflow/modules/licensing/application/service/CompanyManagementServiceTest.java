package com.parkflow.modules.licensing.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicenseAuditLog;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicenseAuditLogPort;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CompanyManagementServiceTest {

  @Mock private CompanyPort companyPort;
  @Mock private LicenseAuditLogPort auditLogPort;
  @Mock private LicenseModuleProvisioner moduleProvisioner;
  @Mock private CompanyResponseAssembler responseAssembler;
  @Mock private AppUserRepository appUserRepository;
  @Mock private PasswordHashService passwordHashService;
  @Mock private AuthSessionPort authSessionPort;

  private CompanyManagementService service;

  @BeforeEach
  void setUp() {
    service = new CompanyManagementService(
        companyPort, auditLogPort, moduleProvisioner, responseAssembler, appUserRepository, passwordHashService, authSessionPort);
    // Default lenient behavior for assembler to return a simple response
    lenient().when(responseAssembler.assemble(any(Company.class)))
        .thenAnswer(inv -> {
          Company c = inv.getArgument(0);
          return CompanyResponse.builder().id(c.getId()).name(c.getName()).plan(c.getPlan()).status(c.getStatus()).build();
        });
  }

  @Test
  void createCompany_success_createsActiveCompany() {
    CreateCompanyRequest req = new CreateCompanyRequest();
    req.setName("ACME Parking");
    req.setNit("900123456");
    req.setPlan(PlanType.PRO);
    req.setTrialDays(0);

    when(companyPort.existsByNit("900123456")).thenReturn(false);
    when(companyPort.existsByName("ACME Parking")).thenReturn(false);
    when(companyPort.save(any(Company.class))).thenAnswer(inv -> {
      Company c = inv.getArgument(0);
      c.setId(UUID.randomUUID());
      return c;
    });

    CompanyResponse resp = service.createCompany(req, "system@tests");

    assertThat(resp).isNotNull();
    assertThat(resp.getName()).isEqualTo("ACME Parking");
    verify(moduleProvisioner).createDefaultModules(any(Company.class));
    verify(auditLogPort).save(any(LicenseAuditLog.class));
    verify(appUserRepository).save(any());
  }

  @Test
  void createCompany_rejectsDuplicateNit() {
    CreateCompanyRequest req = new CreateCompanyRequest();
    req.setName("ACME Parking");
    req.setNit("900123456");

    when(companyPort.existsByNit("900123456")).thenReturn(true);

    assertThatThrownBy(() -> service.createCompany(req, "admin@tests"))
        .isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("NIT");
  }

  @Test
  void getCompany_notFound_throws() {
    UUID id = UUID.randomUUID();
    when(companyPort.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getCompany(id)).isInstanceOf(EntityNotFoundException.class);
  }

  @Test
  void updateCompany_rejectsDuplicateName() {
    UUID id = UUID.randomUUID();
    Company existing = new Company();
    existing.setId(id);
    existing.setName("Old Name");

    UpdateCompanyRequest req = new UpdateCompanyRequest();
    req.setName("New Name");

    when(companyPort.findById(id)).thenReturn(Optional.of(existing));
    when(companyPort.existsByName("New Name")).thenReturn(true);

    assertThatThrownBy(() -> service.updateCompany(id, req, "admin@tests"))
        .isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("nombre");
  }

  @Test
  void deactivateCompany_success_deactivatesUsersAndLogs() {
    UUID id = UUID.randomUUID();
    Company company = new Company();
    company.setId(id);
    company.setName("ACME");

    when(companyPort.findById(id)).thenReturn(Optional.of(company));
    when(appUserRepository.findByCompanyId(id)).thenReturn(List.of());

    service.deactivateCompany(id, "admin@tests");

    verify(companyPort).save(any(Company.class));
    verify(appUserRepository).saveAll(any());
    verify(auditLogPort).save(any(LicenseAuditLog.class));
  }

  @Test
  void deleteCompany_success_performsSoftDelete() {
    UUID id = UUID.randomUUID();
    Company company = new Company();
    company.setId(id);
    company.setStatus(CompanyStatus.ACTIVE);

    when(companyPort.findById(id)).thenReturn(Optional.of(company));
    when(appUserRepository.findByCompanyId(id)).thenReturn(List.of());

    service.deleteCompany(id, "admin@tests");

    assertThat(company.getStatus()).isEqualTo(CompanyStatus.CANCELLED);
    verify(companyPort).save(company);
    verify(auditLogPort).save(any(LicenseAuditLog.class));
  }
}
