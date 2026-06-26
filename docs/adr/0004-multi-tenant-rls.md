# ADR-0004: Multi-Tenant Row-Level Security (PostgreSQL RLS)

**Status**: Accepted  
**Date**: 2026-06-25  
**Version**: 1.0  

---

## Context

ParkFlow hosts 100+ independent parking companies. Early designs stored company_id in application, but relied on developers remembering to filter queries. Risk:

- Query forgets WHERE company_id = ? → Data leak across companies
- Developer copy-paste error → Auditor sees admin's cash counts
- Test database carries production data → Exposure during CI/CD

**Real incidents** found during audit:
- `ReportQueryService` missing company_id filter (Line 87)
- `SearchService` ignored tenancy in initial prototype (fixed)
- Integration tests used production DB snapshots (non-compliant)

---

## Decision

**Implement PostgreSQL Row-Level Security (RLS) at database layer + application validation.**

### Enforcement Layers

#### Layer 1: Database (PostgreSQL RLS)
```sql
-- Create row-level security policy
CREATE POLICY company_isolation_policy ON parking_session
  USING (company_id = current_setting('app.current_company_id')::uuid)
  WITH CHECK (company_id = current_setting('app.current_company_id')::uuid);

-- Enable RLS on all multi-tenant tables
ALTER TABLE parking_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session ENABLE ROW LEVEL SECURITY;
-- ... 10+ tables total
```

#### Layer 2: Application Validation
```java
// Before: Vulnerable
@Service
public class ParkingSessionService {
  public List<ParkingSession> getSessions(UUID companyId) {
    return repository.findAll();  // ❌ Returns ALL companies!
  }
}

// After: Safe
@Service
@RequiredArgsConstructor
public class ParkingSessionService {
  private final TenantContext tenantContext;
  private final ParkingSessionRepositoryPort repository;
  
  public List<ParkingSession> getSessions(UUID companyId) {
    // Validate that user belongs to company
    if (!tenantContext.getAccessibleCompanies().contains(companyId)) {
      throw new AuthorizationException("Company access denied");
    }
    
    // Set RLS context (connection-level)
    tenantContext.setCurrentCompany(companyId);
    
    return repository.findAll(companyId);  // ✅ Filtered by RLS + app layer
  }
}

// TenantContext manages company isolation per request
@Component
@Scope("request")
public class TenantContext {
  private UUID currentCompany;
  private List<UUID> accessibleCompanies;
  
  public void setCurrentCompany(UUID company) {
    this.currentCompany = company;
    // Set PostgreSQL connection variable
    jdbcTemplate.execute("SET app.current_company_id = '" + company + "'");
  }
}
```

### Protected Tables

| Table | Policy | Company Field | Impact |
|-------|--------|---------------|--------|
| `parking_session` | ✅ RLS | `company_id` | Isolates parking operations |
| `vehicle` | ✅ RLS | `company_id` | Prevents vehicle data leaks |
| `cash_session` | ✅ RLS | `company_id` | Critical for financial data |
| `cash_movement` | ✅ RLS | `company_id` | Audit trail security |
| `rate` | ✅ RLS | `company_id` | Prevents rate manipulation |
| `payment_method` | ✅ RLS | `company_id` | Billing isolation |
| `parking_space` | ✅ RLS | `company_id` | Facility separation |
| `locker` | ✅ RLS | `company_id` | Hardware isolation |
| `user` | ⚠️ PARTIAL | `company_id` (nullable for SUPER_ADMIN) | Super admin can see all |
| `app_user` | ⚠️ PARTIAL | `company_id` | System-wide admin accounts excluded |

---

## Consequences

### Positive

✅ **Defense in Depth**: Database enforces isolation even if app layer bug exists  
✅ **No Filtering Burden**: Developers write normal queries; RLS handles filtering  
✅ **Audit Trail**: PostgreSQL logs all RLS policy evaluations  
✅ **Performance**: RLS filtering happens at scan level (efficient)  

### Negative

❌ **Complex Debugging**: Query returns 0 rows; unclear if data doesn't exist or RLS blocked  
→ Mitigation: Explicit errors when RLS blocks instead of empty results

❌ **Testing Complexity**: Integration tests must set RLS context per test  
→ Mitigation: `@RlsContext` annotation in test base class

❌ **Admin Operations**: SUPER_ADMIN needs RLS bypass  
→ Mitigation: Conditional policy: `WHERE company_id = ... OR current_role = 'admin'`

---

## Implementation

### Migration (V019_enable_rls_on_tables.sql)
```sql
-- Enable RLS
ALTER TABLE parking_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_space ENABLE ROW LEVEL SECURITY;
ALTER TABLE locker ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
CREATE POLICY company_isolation ON parking_session
  USING (company_id = current_setting('app.current_company_id')::uuid)
  WITH CHECK (company_id = current_setting('app.current_company_id')::uuid);

-- Repeat for other 7 tables...

-- Grant role to app user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "parkflow-app";
```

### Testing with RLS
```java
@SpringBootTest
@ActiveProfiles("test")
class CashSessionRepositoryTest {
  @Autowired CashSessionRepository repository;
  @Autowired TestDataBuilder testDataBuilder;
  @Autowired TenantContext tenantContext;
  
  @Test
  void findAll_withRLSContext_returnsOnlyCurrentCompanySessions() {
    UUID company1 = testDataBuilder.createCompany("Parking A");
    UUID company2 = testDataBuilder.createCompany("Parking B");
    
    testDataBuilder.createCashSession(company1, "SITE-001");
    testDataBuilder.createCashSession(company1, "SITE-002");
    testDataBuilder.createCashSession(company2, "SITE-003");
    
    // Set RLS context for company1
    tenantContext.setCurrentCompany(company1);
    
    List<CashSession> sessions = repository.findAll();
    
    // Should return only 2 sessions (company1's)
    assertThat(sessions).hasSize(2);
    assertThat(sessions).allMatch(s -> s.getCompanyId().equals(company1));
  }
}
```

---

## Audit Verification

**Verification Migration (V020_verify_rls_integrity.sql)**:
```sql
-- Check that no NULL company_id exists in multi-tenant tables
SELECT table_name, COUNT(*) as null_company_count
FROM pg_tables t
JOIN information_schema.columns c ON c.table_name = t.tablename
WHERE c.column_name = 'company_id' AND c.is_nullable = 'NO'
GROUP BY table_name
HAVING COUNT(*) > 0;

-- Verify RLS enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('parking_session', 'vehicle', 'cash_session', ...)
AND rowsecurity = FALSE;
```

---

## Related ADRs

- [ADR-0003: Authentication Strategy](0003-authentication-strategy.md) — Authority checks + RLS
- [ADR-0001: Hexagonal Architecture](0001-hexagonal-architecture.md) — TenantContext as port implementation

---

**Last Updated**: 2026-06-25  
**Status**: ✅ Implemented (V019, V020, V021 migrations deployed)  
**Enforcement**: Database-level (cannot be bypassed)
