package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.security.RolePermissions;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionSyncService {

    private final AppUserPort appUserRepository;
    private final Map<UUID, Map<String, Object>> permissionCache = new HashMap<>();

    /**
     * Gets current permissions for a user, checking if user is still active.
     * Clears cache and resyncs if user is inactive.
     *
     * @param userId the user ID
     * @param companyId the company context
     * @return permissions as map, or empty if user inactive/not found
     */
    public Map<String, Object> getCurrentPermissionsClaims(UUID userId, UUID companyId) {
        return appUserRepository
            .findById(userId)
            .filter(user -> user.getCompanyId().equals(companyId))
            .filter(AppUser::isActive)
            .map(user -> {
                Map<String, Object> claims = RolePermissions.claims(user.getRole());
                permissionCache.put(userId, claims);
                return claims;
            })
            .orElseGet(() -> {
                permissionCache.remove(userId);
                return Map.of();
            });
    }

    /**
     * Gets permission list for a user.
     *
     * @param userId the user ID
     * @param companyId the company context
     * @return set of permission strings
     */
    @SuppressWarnings("unchecked")
    public Set<String> getCurrentPermissions(UUID userId, UUID companyId) {
        Map<String, Object> claims = getCurrentPermissionsClaims(userId, companyId);
        if (claims.isEmpty()) {
            return Set.of();
        }
        List<String> permissionList = (List<String>) claims.get("permissions");
        return permissionList != null ? Set.copyOf(permissionList) : Set.of();
    }

    /**
     * Invalidates cached permissions for a user (e.g., after role change).
     *
     * @param userId the user ID
     */
    public void invalidatePermissionCache(UUID userId) {
        permissionCache.remove(userId);
        log.debug("Invalidated permission cache for userId={}", userId);
    }

    /**
     * Invalidates all permission caches (e.g., on security policy change).
     */
    public void invalidateAllPermissionCaches() {
        permissionCache.clear();
        log.info("Cleared all permission caches");
    }
}
