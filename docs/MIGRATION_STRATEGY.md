# ParkFlow Database Migration Strategy

**Last Updated**: 2026-06-25  
**Current Schema Version**: V025 (25 migrations)  
**Development Phase**: Pre-production (iterating, not consolidated)

---

## Overview

ParkFlow uses **Flyway** for schema management with a modular migration approach during development. Migrations are organized in tiers, with a consolidation strategy for production launch.

---

## Migration Tiers

### Tier 1: Core Foundation (V001)
**Size**: ~68KB | **Tables**: ~40 | **Type**: DDL

Foundation schema containing all core multi-tenant infrastructure:
- **Auth & Multi-tenancy**: companies, authorized_devices, devices, roles, permissions, app_user
- **Parking Operations**: parking_sites, parking_session, locker, helmet_token, vehicle, rate
- **Financial**: cash_session, cash_movement, payment, payment_methods, monthly_contract, prepaid_balance
- **Configuration**: theme_configuration, company_settings, location, master_vehicle_type, agreement
- **Audit**: audit_event, session_event, subscription

**Critical**: Must apply first. All other migrations depend on these base tables.

---

### Tier 2: Integrity & Performance Fixes (V002–V022)
**Type**: Mixed DDL + DML | **Size**: ~25KB total | **Status**: Patches for Tier 1 issues

#### Sub-Category: Constraints & Foreign Keys
- **V003**: Payment methods → per-company unique constraint (vs. global)
- **V004**: Migrate payment_methods from settings_json → normalized table
- **V005**: Cash movement idempotency protection (UNIQUE constraint)
- **V006**: Soft deletes + authorized_devices multi-tenancy
- **V016**: 🔴 **CRITICAL**: Add 6 missing FK constraints; drop orphan indexes; add 12 FK indexes
- **V018**: Add missing FK on cash_session, cash_movement → companies
- **V021**: Consolidate payment_methods (remove global entries)

#### Sub-Category: Performance & RLS
- **V007**: Event sourcing (outbox_events) + RLS on 4 tables
- **V009–V010**: Audit/session event indexes
- **V017**: Performance indexes + authorized_devices uniqueness fix
- **V019**: Enable RLS on 10 critical multi-tenant tables

#### Sub-Category: Validation & Cleanup
- **V002**: Branding color update (legacy → terracota)
- **V008**: Fix payment.session_id uniqueness (allow multiple payments per session)
- **V011**: Cash denomination normalization
- **V012**: Auth stabilization (permissions refactor)
- **V013**: Rate tax fields
- **V020**: 🟡 **VALIDATION**: Verify V015 data migration didn't orphan records
- **V022**: Drop deprecated site/terminal columns

**Key Point**: V016 & V020 are intentionally separate—they validate fixes for major refactors (V015).

---

### Tier 3: Feature Extensions (V023–V025)
**Type**: DDL | **Size**: ~18KB total | **Status**: New modules, feature-gated

- **V023**: Support module (WhatsApp tickets)
  - 11 tables: tickets, conversations, messages, attachments, labels, etc.
  - Independent from core; can be disabled in feature flags
  
- **V024**: Billing platform (e-invoicing)
  - 7 tables: providers, invoices, items, tax_config, webhooks, notes, logs
  - Depends on V015 (client table)
  - Multi-country, multi-provider abstraction

- **V025**: Document type field for clients
  - Depends on V024

**Key Point**: These are production-ready but can be rolled back if features are disabled.

---

## Development Workflow

### Current Practice (In Development)

**✅ DO**:
```bash
# Add new migrations as V026, V027, etc.
# Keep them focused on single feature/fix
# Example:
# V026__add_employee_shift_management.sql    (new table + indexes)
# V027__add_helmet_allocation_rules.sql      (new feature)
```

**❌ DON'T**:
```bash
# Don't try to consolidate manually
# Don't merge V001 + V002 + V009 (creates confusion)
# Don't modify already-applied migrations (Flyway prevents this anyway)
```

### New Entity Checklist

When adding a new module/table:

1. **Create JPA Entity**:
   ```java
   @Entity
   @Table(name = "my_new_table")
   public class MyEntity {
       @Id
       @GeneratedValue(strategy = GenerationType.UUID)
       private String id;
       
       @Column(name = "company_id", nullable = false)
       private String companyId;  // Multi-tenancy
       
       @Column(name = "status", nullable = false, length = 50)
       private String status;
       
       @CreationTimestamp
       @Column(name = "created_at", nullable = false, updatable = false)
       private LocalDateTime createdAt;
       
       @UpdateTimestamp
       @Column(name = "updated_at", nullable = false)
       private LocalDateTime updatedAt;
   }
   ```

2. **Create Flyway Migration** (next sequential V0XX):
   ```sql
   -- V026__create_my_new_table.sql
   CREATE TABLE my_new_table (
       id UUID PRIMARY KEY,
       company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
       status VARCHAR(50) NOT NULL,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CHECK (status IN ('ACTIVE', 'INACTIVE'))
   );
   
   CREATE INDEX idx_my_new_table_company_id ON my_new_table(company_id);
   
   -- Enable RLS if multi-tenant
   ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;
   CREATE POLICY my_new_table_company_isolation ON my_new_table
       USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
   ```

3. **Verify**:
   ```bash
   cd apps/api
   gradle build
   # If migration applies cleanly → you're done
   ```

---

## Production Consolidation Strategy (Week Before Launch)

**Timeline**: 1 week before production launch  
**Effort**: ~2 hours

### Step 1: Create Consolidated Baseline

```bash
# Export current schema after all V001–V025 migrations
pg_dump -h localhost -U parkflow_user parkflow_dev --schema-only \
  > apps/api/src/main/resources/db/migration/V_PROD_001__consolidated_baseline.sql

# This creates a single 70KB file with:
# - All 40+ tables
# - All indexes
# - All FK constraints
# - All RLS policies
```

### Step 2: Archive Development Migrations

```bash
# Rename old migrations (keep for git history)
cd apps/api/src/main/resources/db/migration

# Option A: Delete if you're confident (git history remains)
rm V001__initial_schema.sql V002__update_brand_primary_color.sql ... V025__add_document_type_to_client.sql

# Option B: Move to archive folder (if you want to keep them visible)
mkdir archived_dev_migrations
mv V00*.sql archived_dev_migrations/
```

### Step 3: Start Fresh

```bash
# Next new migrations start at V_PROD_002
# V_PROD_001 is the baseline, frozen forever
# All future changes go in V_PROD_002, V_PROD_003, etc.
```

### Why This Works

✅ **Operators see ONE baseline** instead of 25 "legacy" migrations  
✅ **Git history is preserved** (you can still `git log` the evolution)  
✅ **Fresh start for features** (new migrations are isolated & clean)  
✅ **Simple mental model** ("apply V_PROD_001 on first deploy, then V_PROD_002+")  

---

## Health Checks

### Pre-Development
```bash
# After pulling latest
cd apps/api
gradle clean build

# Check migrations apply
# Logs should show: Flyway: Successfully validated 25 migrations
```

### Before Each Commit
```bash
# Verify your new migration applies cleanly
cd apps/api
gradle test  # Runs integration tests with migrations

# Check schema integrity (optional)
psql parkflow_dev -c "
  SELECT COUNT(*) as table_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"
# Should return ~45 tables
```

### Pre-Production
```bash
# Final validation before consolidation
pg_dump -h localhost -U parkflow_user parkflow_dev --schema-only \
  | grep -c "CREATE TABLE"
# Should match your entity count

# Check RLS is enabled
psql parkflow_dev -c "
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('payment', 'vehicle', 'rate', 'monthly_contract', 'prepaid_balance')
  ORDER BY tablename;
"
# All should show "Policies: ..." in psql describe
```

---

## FAQ

### Q: "Can I modify V001?"
**A**: No. Flyway prevents this (migrations are immutable). If you need to fix V001, create V026__fix_initial_schema.sql.

### Q: "Why is V016 separate from V015?"
**A**: V015 introduced bugs (missing FK constraints). V016 fixes them. Separation allows debugging: if production breaks, you know exactly which migration caused it.

### Q: "What if I add a migration but don't commit it?"
**A**: Flyway still applies it. On next pull (without the migration file), it will fail with "Detected failed migration". Delete the row from `flyway_schema_history` table and retry.

### Q: "Should I consolidate after every sprint?"
**A**: No. Only consolidate when moving to production (one-time event).

### Q: "What about Hibernate auto-generation?"
**A**: Don't use `hibernate.ddl-auto=update` or `create-drop`. Flyway is source of truth. JPA entities are read-only; migrations are write.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Flyway** | Database migration tool; executes SQL files sequentially |
| **RLS** | Row-Level Security; PostgreSQL feature for multi-tenant isolation |
| **Idempotency** | Property where operation can be applied multiple times safely |
| **Consolidation** | Merging 25+ migrations into 1 baseline (pre-production task) |
| **Multi-tenancy** | Schema where each row has a company_id; enforced by RLS |

---

## References

- **Flyway Docs**: https://flywaydb.org/documentation/
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **ParkFlow CLAUDE.md**: See `/CLAUDE.md` for architectural standards
- **Current Migrations**: `/apps/api/src/main/resources/db/migration/`
- **Schema Snapshot** (production reference): Generated during consolidation
