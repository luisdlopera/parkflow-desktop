package com.parkflow.modules.auth.domain.repository;

import java.util.UUID;

public interface AuthCompanyPort {
    boolean isOnboardingCompleted(UUID companyId);
}
