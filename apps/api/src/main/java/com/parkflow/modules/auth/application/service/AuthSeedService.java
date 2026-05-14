package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthSeedService implements CommandLineRunner {
  private final AppUserRepository appUserRepository;
  private final PasswordHashService passwordHashService;

  @Value("${app.security.seed-admin-email:admin@parkflow.local}")
  private String seedAdminEmail;

  @Value("${app.security.seed-admin-password:Qwert.12345}")
  private String seedAdminPassword;

  @Override
  @Transactional
  public void run(String... args) {
    AppUser user =
        appUserRepository.findGlobalByEmail(seedAdminEmail).orElseGet(AppUser::new);

    boolean created = user.getId() == null;
    if (created) {
      user.setName("Administrador");
      user.setEmail(seedAdminEmail);
      user.setRole(UserRole.SUPER_ADMIN);
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
