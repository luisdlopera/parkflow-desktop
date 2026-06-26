# Database Architecture & Schema

## Overview

**ParkFlow** uses PostgreSQL with Flyway for schema versioning. The schema was **consolidated on 2026-06-26**: 38 incremental migrations (V001–V039) were squashed into a single clean baseline.

---

## Current Schema State

### Baseline Migration

**File**: `apps/api/src/main/resources/db/migration/V001__initial_schema.sql`  
**Size**: 2,493 lines  
**Status**: ✅ Immutable baseline  
**Created**: 2026-06-26 (consolidated from 38 migrations)

### Tables & Objects

```
84 Tables
├── Core Auth (10)
│   ├── app_user, auth_sessions, authorized_devices, password_reset_tokens
│   ├── auth_audit_log, app_user_permission, roles, permissions, role_permissions
│   └── user_roles
├── Parking Operations (10)
│   ├── parking_session, parking_sites, parking_space, parking_space_assignment
│   ├── vehicle, vehicle_condition_report, session_event, vehicle_type
│   ├── master_vehicle_type, company_vehicle_type
├── Cash Management (6)
│   ├── cash_session, cash_movement, cash_register, cash_session_denomination
│   ├── cash_fe_sequence, cash_closing_report
├── Billing & Invoicing (10)
│   ├── payment, payment_methods, electronic_invoices, electronic_invoice_items
│   ├── invoice_notes, invoice_providers, invoice_provider_webhooks
│   ├── electronic_invoice_logs, subscriptions, prepaid_balance
├── Configuration (15)
│   ├── companies, company_settings, company_modules, onboarding_progress
│   ├── onboarding_defaults, onboarding_question_config, devices
│   ├── rate, rate_fractions, agreement, operational_parameters
│   ├── theme_config, license_support, regional_settings
│   └── cash_audit_log
├── Support & Tickets (9)
│   ├── tickets, ticket_messages, ticket_attachments, ticket_assignments
│   ├── ticket_events, ticket_categories, ticket_sla, ticket_counter
│   └── ticket_audit_logs
├── API & Integration (3)
│   ├── api_keys, outbox_events (transactional outbox), sync_events
├── Audit & Compliance (3)
│   ├── global_audit_log, audit_event, license_audit_log
└── Other (4)
    ├── company_settings_snapshot, devices, blacklisted_plate, operation_idempotency
```

### Indexes & Constraints

- **136 Indexes** (covering FK references, filter columns, partial indexes on soft-deletes)
- **123 PRIMARY KEYS + UNIQUE CONSTRAINTS**
- **124 FOREIGN KEYS** (with ON DELETE CASCADE for referential integrity)
- **17 RLS POLICIES** (Row-Level Security for multi-tenancy)

---

## Multi-Tenant Architecture

### Defense-in-Depth Model

ParkFlow enforces multi-tenancy at three levels:

**1. Database Level (RLS — Row-Level Security)**
```sql
-- Example: Vehicle table
CREATE POLICY rls_vehicle ON vehicle TO parkflow_app
USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```
- Every query on the `vehicle` table is automatically filtered by `company_id`
- Even if application code is bypassed, database enforces isolation
- Uses PostgreSQL's `SET app.tenant_id = '{company_id}'` session variable

**2. Application Level (TenantContext Filter)**
```java
// Spring Security filter sets tenant in all threads
SecurityContextHolder.setContext(tenantId)
// Every repository query gets WHERE company_id = context.getTenantId()
```

**3. API Level (AuthenticationService)**
```java
// Login returns AuthSession with company_id
// All subsequent API calls validate request belongs to authenticated company
```

### Multi-Tenant Verification

**Tables with company_id (verified)**:
- ✅ agreement, api_keys, app_user, auth_audit_log, auth_sessions
- ✅ authorized_devices, cash_audit_log, cash_closing_report, cash_movement
- ✅ cash_register, cash_session, company_modules, company_settings
- ✅ company_settings_snapshot, company_vehicle_type, electronic_invoice_items
- ✅ electronic_invoice_logs, electronic_invoices, invoice_notes, invoice_providers
- ✅ license_support, monthly_contract, operational_parameters, parking_session
- ✅ parking_sites, parking_space, parking_space_assignment, password_reset_tokens
- ✅ payment, prepaid_balance, rate, rate_fractions, regional_settings
- ✅ session_event, subscriptions, ticket_assignments, ticket_attachments
- ✅ ticket_audit_logs, tickets, vehicle

**Global Tables (no company_id — intentional)**:
- roles, permissions, role_permissions, user_roles (system-wide)
- master_vehicle_type, devices (global reference data)
- theme_config, onboarding_defaults (system defaults)

---

## Key Design Patterns

### 1. Soft Deletes

Tables like `vehicle` and `app_user` use `deleted_at TIMESTAMPTZ` instead of hard deletes:

```sql
-- In V001
ALTER TABLE vehicle ADD COLUMN deleted_at TIMESTAMPTZ;

-- Indexes filter to active records
CREATE INDEX idx_vehicle_company_active 
ON vehicle(company_id) 
WHERE deleted_at IS NULL;

-- RLS policies automatically exclude soft-deleted rows
```

### 2. Transactional Outbox (Event Sourcing Pattern)

```sql
-- V001 includes outbox_events table
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    retry_count INT DEFAULT 0
);
```
- Guarantees event delivery even if listener fails
- Used for cache invalidation, webhooks, external API calls

### 3. Idempotency Keys

```sql
-- Cash movements use idempotency_key for deduplication
ALTER TABLE cash_movement ADD COLUMN idempotency_key UUID UNIQUE;

-- INSERT fails if same key is used twice → prevents double charges
```

### 4. Partial Indexes for Performance

```sql
-- Only index active records (not soft-deleted)
CREATE INDEX idx_vehicle_active ON vehicle(company_id)
WHERE deleted_at IS NULL;

-- Only index unpaid invoices (query filter)
CREATE INDEX idx_payment_pending ON payment(company_id, status)
WHERE status IN ('PENDING', 'OVERDUE');
```

---

## Seed Data

**File Section**: SECTION 8 in V001__initial_schema.sql

**Includes**:
- 3 Plan types (Basic, Pro, Enterprise)
- 5 Roles (Admin, Supervisor, Cashier, Operator, Auditor)
- 9 Permissions (auth.login, users.manage, rates.manage, etc.)
- 1 Demo Company ("Empresa Demo")
- 1 Demo Parking Site ("Sede Principal")
- 12 Payment Methods (Cash, Debit/Credit, Nequi, Transfer, QR, etc.)

**Note**: User account seeding (admin@parkflow.local) happens via `AuthSeedService` on API startup, not in migrations.

---

## Data Types & Conventions

### Column Naming
- `snake_case` for all columns
- Timestamps: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Soft deletes: `deleted_at TIMESTAMPTZ` (null = active)
- Audit: `company_id UUID`, `created_by UUID` (FK to app_user)
- Status: `status VARCHAR(20)` with CHECK constraint

### Type Safety
- **IDs**: Always `UUID DEFAULT gen_random_uuid()` (no SERIAL sequences)
- **Money**: `NUMERIC(12,2)` for currency (cents precision)
- **Ratios/Percentages**: `NUMERIC(5,2)` for bounded values (0-100)
- **JSON**: `JSONB` for flexible schemas (logs, configs)
- **Booleans**: `BOOLEAN DEFAULT FALSE` (explicit default)
- **Timestamps**: `TIMESTAMPTZ DEFAULT NOW()` (timezone-aware)

### Constraint Conventions

```sql
-- Primary Key
CONSTRAINT {table}_pkey PRIMARY KEY (id)

-- Unique Key
CONSTRAINT {table}_{column}_key UNIQUE ({column})
CONSTRAINT {table}_{col1}_{col2}_key UNIQUE (col1, col2)

-- Foreign Key
CONSTRAINT fk_{table}_{ref_table} FOREIGN KEY (column) REFERENCES {ref_table}(id) ON DELETE CASCADE

-- Check Constraint
CONSTRAINT chk_{table}_{rule} CHECK (amount >= 0 AND amount <= 999999.99)

-- RLS Policy
rls_{table}
```

---

## Flyway Configuration

**File**: `apps/api/build.gradle`

```gradle
flyway {
    baselineVersion = "1"
    baselineDescription = "Initial schema consolidation"
    baselineOnMigrate = true      // Auto-create baseline on first run
    repairOnMigrate = true        // Auto-fix checksums (dev only)
}
```

### How It Works

1. On API startup, `FlywayMigrate` task runs automatically
2. Flyway checks `flyway_schema_history` table for applied migrations
3. If V001 not in history → applies V001 (creates all 84 tables)
4. If V001 in history → skips (already applied)
5. If V040+ in migrations dir → applies in order
6. If checksum mismatch → either fails (production) or repairs (development)

### Schema History Tracking

```sql
SELECT version, description, success, installed_on 
FROM flyway_schema_history 
ORDER BY installed_on;
```

---

## Disaster Recovery

### Scenario: Fresh Database

```bash
# Start clean
pnpm db:down -v  # Remove volumes
pnpm db:up       # Create fresh container

# Flyway auto-applies V001
cd apps/api && ./gradlew flywayMigrate

# Verify
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# Output: 85 (84 schema + flyway_schema_history)
```

### Scenario: Add New Migration

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for the complete workflow.

### Scenario: Rollback (Migration Failed)

Flyway doesn't support rollbacks. Instead:

```bash
# 1. Revert the commit
git revert <commit-hash>

# 2. Fix the migration locally
vim src/main/resources/db/migration/V040__feature.sql

# 3. Completely wipe database
pnpm db:down -v && pnpm db:up

# 4. Test again
cd apps/api && ./gradlew flywayMigrate

# 5. Commit the fix
git commit -m "fix(db): correct V040 syntax"
```

---

## Performance Tuning

### Index Usage by Module

| Module | Indexes | Purpose |
|--------|---------|---------|
| **Auth** | 15 | User lookups, session filtering, device tracking |
| **Parking** | 25 | Space availability, session status, vehicle lookup |
| **Cash** | 12 | Session closure, movement auditing |
| **Payment** | 18 | Invoice status, company filtering, aging reports |
| **Config** | 20 | Rate lookups, site filtering, company settings |
| **Multi-tenant** | 36 | company_id on every table |

### Partial Index Example

```sql
-- Only index active users (not deleted)
CREATE INDEX idx_app_user_active ON app_user(company_id, email)
WHERE deleted_at IS NULL;

-- Reduces index size by 70-80% in production
```

---

## Maintenance Tasks

### Weekly
```bash
# Check table sizes
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
        FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Monthly
```bash
# Analyze query performance
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev -c "ANALYZE;"

# Check for unused indexes
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev -c "SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;"
```

### Before Production Release
```bash
# Verify all multi-tenant tables have RLS
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT schemaname, tablename FROM pg_tables 
        WHERE schemaname='public' AND tablename NOT IN (SELECT table_name FROM information_schema.role_table_grants 
        WHERE grantee='parkflow_app');"
```

---

## References

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenant Patterns](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) — How to add new migrations
- [OPERATIONS.md](OPERATIONS.md) — Backup, restore, disaster recovery
