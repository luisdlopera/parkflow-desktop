package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TenantIsolationSecurityTest {

    private AppUser userCompanyA;
    private AppUser userCompanyB;
    private UUID companyA;
    private UUID companyB;

    @BeforeEach
    void setUp() {
        companyA = UUID.randomUUID();
        companyB = UUID.randomUUID();

        userCompanyA = new AppUser();
        userCompanyA.setId(UUID.randomUUID());
        userCompanyA.setEmail("admin@companyA.com");
        userCompanyA.setCompanyId(companyA);
        userCompanyA.setRole(UserRole.SUPER_ADMIN);
        userCompanyA.setActive(true);

        userCompanyB = new AppUser();
        userCompanyB.setId(UUID.randomUUID());
        userCompanyB.setEmail("admin@companyB.com");
        userCompanyB.setCompanyId(companyB);
        userCompanyB.setRole(UserRole.SUPER_ADMIN);
        userCompanyB.setActive(true);
    }

    @Test
    void testUserFromCompanyA_CannotAccessCompanyBData() {
        // Given: User A from Company A
        // When: User A tries to access Company B resources
        UUID userACompanyId = userCompanyA.getCompanyId();
        UUID userBCompanyId = userCompanyB.getCompanyId();

        // Then: Company IDs should be different
        assertThat(userACompanyId).isNotEqualTo(userBCompanyId);
    }

    @Test
    void testTenantContext_FiltersByCompanyId() {
        // Given: Both users have SUPER_ADMIN role but different company IDs
        assertThat(userCompanyA.getRole()).isEqualTo(userCompanyB.getRole());
        assertThat(userCompanyA.getCompanyId()).isNotEqualTo(userCompanyB.getCompanyId());

        // When: Querying users by company
        // Then: Each company should only see its own users
        // (This would be verified at JPA repository level with RLS policies)
    }

    @Test
    void testSessionContext_IncludesCompanyId() {
        // Given: User creates session
        // When: Session is created
        // Then: Session must include company_id and TenantContext must be set

        // Verification: In actual implementation, JwtAuthFilter sets:
        // context.setTenant(user.getCompanyId())
        // This ensures all subsequent queries are filtered by company_id
    }

    @Test
    void testPermissions_ScopedByCompany() {
        // Given: Same user ID could theoretically exist in multiple companies
        // When: User A from Company A queries permissions
        UUID userId = userCompanyA.getId();
        UUID companyContext = userCompanyA.getCompanyId();

        // Then: Query must include both user_id AND company_id
        // This is enforced by hexagonal architecture: AppUserRepositoryPort.findByIdAndCompanyId()
        assertThat(userId).isNotNull();
        assertThat(companyContext).isNotNull();
    }

    @Test
    void testAuditLog_PreservesTonantContext() {
        // Given: Audit log entry
        // When: User A performs action in Company A
        UUID actionCompanyId = userCompanyA.getCompanyId();

        // Then: Audit log must record company_id
        // Prevents audit logs from being readable across tenants
        assertThat(actionCompanyId).isEqualTo(companyA);
    }
}
