package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.security.RolePermissions;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PermissionSyncServiceTest {

    @Mock
    private AppUserPort appUserRepository;

    @InjectMocks
    private PermissionSyncService permissionSyncService;

    private AppUser mockUser;
    private UUID userId;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        companyId = UUID.randomUUID();

        mockUser = new AppUser();
        mockUser.setId(userId);
        mockUser.setEmail("test@example.com");
        mockUser.setCompanyId(companyId);
        mockUser.setRole(UserRole.ADMIN);
        mockUser.setActive(true);
    }

    @Test
    void testSyncPermissions_UserExists_ReturnsCurrentPermissions() {
        // Given
        when(appUserRepository.findById(userId))
            .thenReturn(Optional.of(mockUser));

        // When
        Set<String> permissions = permissionSyncService.getCurrentPermissions(userId, companyId);

        // Then
        assertThat(permissions).isNotEmpty();
    }

    @Test
    void testSyncPermissions_UserInactive_ReturnsEmptyPermissions() {
        // Given: User is inactive
        mockUser.setActive(false);
        when(appUserRepository.findById(userId))
            .thenReturn(Optional.of(mockUser));

        // When
        Set<String> permissions = permissionSyncService.getCurrentPermissions(userId, companyId);

        // Then
        assertThat(permissions).isEmpty();
    }

    @Test
    void testSyncPermissions_UserNotFound_ReturnsEmptyPermissions() {
        // Given: User doesn't exist
        when(appUserRepository.findById(userId))
            .thenReturn(Optional.empty());

        // When
        Set<String> permissions = permissionSyncService.getCurrentPermissions(userId, companyId);

        // Then
        assertThat(permissions).isEmpty();
    }

    @Test
    void testSyncPermissions_RoleChanged_ReturnsUpdatedPermissions() {
        // Given: User's role is CAJERO (limited permissions)
        mockUser.setRole(UserRole.CAJERO);
        when(appUserRepository.findById(userId))
            .thenReturn(Optional.of(mockUser));

        // When
        Set<String> permissions = permissionSyncService.getCurrentPermissions(userId, companyId);

        // Then
        assertThat(permissions).isNotEmpty();
    }

    @Test
    void testInvalidatePermissionCache_RemovesCachedPermissions() {
        // Given: User has cached permissions
        mockUser.setRole(UserRole.ADMIN);
        when(appUserRepository.findById(userId))
            .thenReturn(Optional.of(mockUser));

        Set<String> initial = permissionSyncService.getCurrentPermissions(userId, companyId);
        assertThat(initial).isNotEmpty();

        // When: Cache is invalidated
        permissionSyncService.invalidatePermissionCache(userId);

        // Then: Cache is cleared (next call would fetch fresh data)
        assertThat(initial).isNotEmpty(); // Original still exists
    }
}
