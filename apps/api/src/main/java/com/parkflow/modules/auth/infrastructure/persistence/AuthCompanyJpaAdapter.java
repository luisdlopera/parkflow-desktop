package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.repository.AuthCompanyPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
@RequiredArgsConstructor
public class AuthCompanyJpaAdapter implements AuthCompanyPort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public boolean isOnboardingCompleted(UUID companyId) {
        if (companyId == null) {
            return false;
        }
        try {
            Boolean completed = jdbcTemplate.queryForObject(
                "SELECT onboarding_completed FROM companies WHERE id = ?",
                Boolean.class,
                companyId
            );
            return completed != null && completed;
        } catch (Exception e) {
            log.warn("Could not fetch onboarding status for company {}", companyId);
            return false;
        }
    }
}
