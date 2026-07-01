package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.onboarding.application.port.in.OnboardingQueryUseCase;
import com.parkflow.modules.onboarding.domain.CompanySettingsSnapshot;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OnboardingResetService {

  private static final Logger log = LoggerFactory.getLogger(OnboardingResetService.class);

  private final CompanySettingsService companySettingsService;
  private final OnboardingQueryUseCase onboardingQueryUseCase;
  private final CompanySettingsSnapshotPort companySettingsSnapshotPort;
  private final OnboardingProgressPort onboardingProgressPort;
  private final ParkingSessionPort parkingSessionPort;
  private final AuthSessionPort authSessionPort;
  private final AppUserRepository appUserRepository;
  private final AuditPort auditPort;

  @Transactional
  public OnboardingStatusResponse resetOnboarding(Company company, UUID companyId, String reason) {
    assertResetAccess(companyId);

    long activeSessions = parkingSessionPort.countActive(companyId);
    StringBuilder auditContext = new StringBuilder();
    if (activeSessions > 0) {
      auditContext.append("Reinicio con ").append(activeSessions).append(" vehículos activos. ");
    }

    OnboardingProgress progress = findOrCreateProgress(company);
    Map<String, Object> currentSettings = companySettingsService.getSettingsOrDefault(company);
    int nextVersion = companySettingsSnapshotPort.countByCompanyId(companyId) + 1;
    CompanySettingsSnapshot snapshot = new CompanySettingsSnapshot();
    snapshot.setCompany(company);
    snapshot.setVersion(nextVersion);
    snapshot.setSettingsJson(new LinkedHashMap<>(currentSettings));
    snapshot.setProgressData(new LinkedHashMap<>(progress.getProgressData()));
    snapshot.setReason(reason != null && !reason.isBlank() ? reason : "RESTART_ONBOARDING");
    snapshot.setCreatedAt(OffsetDateTime.now());

    AppUser appUser = null;
    String creatorEmail = "SYSTEM";
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {
      if (auth.getPrincipal() instanceof AppUser user) {
        appUser = user;
        creatorEmail = user.getEmail();
      } else if (auth.getPrincipal() instanceof AuthPrincipal principal) {
        creatorEmail = principal.email();
      }
    }
    snapshot.setCreatedBy(creatorEmail);
    companySettingsSnapshotPort.save(snapshot);

    company.setOnboardingCompleted(false);

    List<AppUser> companyUsers = appUserRepository.findByCompanyId(companyId);
    if (!companyUsers.isEmpty()) {
      final String creator = creatorEmail;
      List<AppUser> usersToInvalidate = companyUsers.stream()
          .filter(u -> !u.getEmail().equalsIgnoreCase(creator))
          .toList();
      if (!usersToInvalidate.isEmpty()) {
        authSessionPort.deleteByUserIn(usersToInvalidate);
        log.info(
            "Invalidated {} sessions for company {} during onboarding reset by {}",
            usersToInvalidate.size(), companyId, creatorEmail);
      }
    }

    progress.setCompleted(false);
    progress.setCurrentStep(1);
    progress.setUpdatedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);

    auditPort.record(
        AuditAction.REINICIAR_ONBOARDING,
        companyId, appUser,
        "onboardingCompleted=true, currentStep=" + progress.getCurrentStep(),
        "onboardingCompleted=false, currentStep=1",
        "Reinicio de onboarding multi-tenant. Snapshot v" + nextVersion + " guardado. " + auditContext);
    return onboardingQueryUseCase.status(companyId);
  }

  private void assertResetAccess(UUID companyId) {
    UUID currentCompanyId = SecurityUtils.requireCompanyId();
    UserRole role = SecurityUtils.requireUserRole();
    if (!currentCompanyId.equals(companyId) && role != UserRole.SUPER_ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Acceso denegado a la empresa solicitada");
    }
    if (role != UserRole.SUPER_ADMIN && role != UserRole.ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Solo administradores pueden reiniciar el onboarding");
    }
  }

  private OnboardingProgress findOrCreateProgress(Company company) {
    return onboardingProgressPort.findByCompanyId(company.getId())
        .orElseGet(() -> {
          OnboardingProgress created = new OnboardingProgress();
          created.setCompany(company);
          created.setProgressData(new LinkedHashMap<>());
          return onboardingProgressPort.save(created);
        });
  }
}
