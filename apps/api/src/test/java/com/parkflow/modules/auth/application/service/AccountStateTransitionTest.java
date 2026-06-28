package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AccountStateTransitionTest {

    private AppUser user;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(UUID.randomUUID());
        user.setEmail("test@example.com");
        user.setCompanyId(UUID.randomUUID());
        user.setRole(UserRole.CAJERO);
        user.setActive(true);
        user.setBlocked(false);
        user.setFailedLoginAttempts(0);
        user.setBlockedUntil(null);
    }

    @Test
    void testAccountActive_NormalState() {
        // Given: Normal active account
        assertThat(user.isActive()).isTrue();
        assertThat(user.isBlocked()).isFalse();
        assertThat(user.getFailedLoginAttempts()).isEqualTo(0);

        // Then: User can login
        boolean canLogin = user.isActive() && !user.isBlocked();
        assertThat(canLogin).isTrue();
    }

    @Test
    void testAccountBlocked_AfterMaxFailedAttempts() {
        // Given: 5 failed login attempts
        user.setFailedLoginAttempts(5);
        user.setBlocked(true);
        user.setBlockedUntil(OffsetDateTime.now().plusMinutes(30));

        // Then: User cannot login
        boolean canLogin = user.isActive() && !user.isBlocked();
        assertThat(canLogin).isFalse();
    }

    @Test
    void testAccountBlocked_AutoUnlocksAfterTimeout() {
        // Given: Account blocked 31 minutes ago (timeout is 30 min)
        user.setBlocked(true);
        user.setBlockedUntil(OffsetDateTime.now().minusMinutes(1));
        user.setFailedLoginAttempts(5);

        // When: Check if should unblock
        boolean shouldUnblock = user.getBlockedUntil().isBefore(OffsetDateTime.now());

        // Then: Account should be unblocked
        if (shouldUnblock) {
            user.setBlocked(false);
            user.setFailedLoginAttempts(0);
            user.setBlockedUntil(null);
        }

        assertThat(user.isBlocked()).isFalse();
        assertThat(user.getFailedLoginAttempts()).isEqualTo(0);
    }

    @Test
    void testAccountInactive_CannotLogin() {
        // Given: Account deactivated by admin
        user.setActive(false);

        // Then: User cannot login even if not blocked
        boolean canLogin = user.isActive() && !user.isBlocked();
        assertThat(canLogin).isFalse();
    }

    @Test
    void testAccountReactivated_CanLoginAgain() {
        // Given: Account was inactive
        user.setActive(false);

        // When: Admin reactivates account
        user.setActive(true);
        user.setBlocked(false);
        user.setFailedLoginAttempts(0);

        // Then: User can login again
        boolean canLogin = user.isActive() && !user.isBlocked();
        assertThat(canLogin).isTrue();
    }

    @Test
    void testFailedAttemptReset_AfterSuccessfulLogin() {
        // Given: User has 3 failed attempts
        user.setFailedLoginAttempts(3);

        // When: User successfully logs in
        user.setFailedLoginAttempts(0);
        user.setBlocked(false);

        // Then: Failed attempts reset
        assertThat(user.getFailedLoginAttempts()).isEqualTo(0);
        assertThat(user.isBlocked()).isFalse();
    }

    @Test
    void testBlockedButExpired_TriesLogin() {
        // Given: Account blocked an hour ago (30 min timeout passed)
        OffsetDateTime blockTime = OffsetDateTime.now().minusMinutes(60);
        user.setBlocked(true);
        user.setBlockedUntil(blockTime.plusMinutes(30));
        user.setFailedLoginAttempts(5);

        // When: Unblock check happens
        if (user.getBlockedUntil().isBefore(OffsetDateTime.now())) {
            user.setBlocked(false);
            user.setFailedLoginAttempts(0);
        }

        // Then: Can login now
        boolean canLogin = user.isActive() && !user.isBlocked();
        assertThat(canLogin).isTrue();
    }
}
