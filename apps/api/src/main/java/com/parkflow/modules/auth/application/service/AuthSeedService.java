package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@Profile("!ci")
public class AuthSeedService implements CommandLineRunner {
  private final AppUserPort appUserRepository;
  private final PasswordHashService passwordHashService;
  private final CompanyPort companyPort;

  @Value("${app.security.seed-admin-email:admin@parkflow.local}")
  private String seedAdminEmail;

  @Value("${app.security.seed-admin-password:Qwert.12345}")
  private String seedAdminPassword;

  @Override
  @Transactional
  public void run(String... args) {
    // Create default company if none exists
    UUID companyId;
    var companies = companyPort.findAll();
    if (companies.isEmpty()) {
      Company company = new Company();
      company.setName("ParkFlow Default");
      company.setNit("123456789");
      company.setEmail(seedAdminEmail);
      company.setContactName("Admin");
      company.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.TRIAL);
      company.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
      company.setMaxDevices(10);
      company.setMaxLocations(5);
      company.setMaxUsers(20);
      company.setOnboardingCompleted(true);
      Company saved = companyPort.save(company);
      companyId = saved.getId();
      log.info("AUTH-SEED: Created default company with id={}", companyId);
    } else {
      companyId = companies.get(0).getId();
    }

    AppUser user =
        appUserRepository.findGlobalByEmail(seedAdminEmail).orElseGet(AppUser::new);

    boolean created = user.getId() == null;
    if (created) {
      user.setName("Administrador");
      user.setEmail(seedAdminEmail);
      user.setRole(UserRole.SUPER_ADMIN);
      user.setCompanyId(companyId);
    }

    String expectedPrefix = "$2";
    String currentHash = user.getPasswordHash();
    boolean shouldRehash = currentHash == null
        || currentHash.isBlank()
        || !currentHash.startsWith(expectedPrefix)
        || !passwordHashService.matchesPassword(seedAdminPassword, currentHash);

    if (shouldRehash) {
      user.setPasswordHash(passwordHashService.encodePassword(seedAdminPassword));
      log.warn("AUTH-SEED: Rebuilt admin password hash for {}", seedAdminEmail);
    }

    user.setActive(true);
    user.setCanVoidTickets(true);
    user.setCanReprintTickets(true);
    user.setCanCloseCash(true);
    user.setRequirePasswordChange(false);
    appUserRepository.save(user);
  }
}
