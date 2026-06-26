# Database Migration Guide

## Quick Reference

Adding a new database change? Follow this flow:

```bash
# 1. Create migration file
V_NEXT=$(ls apps/api/src/main/resources/db/migration | grep '^V[0-9]' | sort -V | tail -1 | sed 's/V0*\([0-9]*\).*/\1/' | awk '{print $1+1}')
cat > apps/api/src/main/resources/db/migration/V${V_NEXT}__feature_name.sql

# 2. Add SQL (see templates below)

# 3. Test on fresh database
pnpm db:down -v && pnpm db:up
cd apps/api && ./gradlew flywayMigrate

# 4. Verify API starts
./gradlew bootRun
# Should see: "Started ParkflowApiApplication in X.XXX seconds"

# 5. Commit
git add apps/api/src/main/resources/db/migration/V${V_NEXT}__feature_name.sql
git commit -m "feat(db): add feature_name table"
```

---

## Naming & Versioning

### File Format

**Pattern**: `V{number}__{description}.sql`

```
✅ V040__add_feature_table.sql
✅ V041__add_column_to_user.sql
✅ V100__refactor_indexes.sql

❌ V40__feature.sql (leading zero required)
❌ V040__AddFeatureTable.sql (must be lowercase)
❌ V040__add-feature-table.sql (no hyphens)
```

### Version Sequence

**Current State**:
- V001 = Squashed baseline (immutable, 2,493 lines)
- V002-V039 = Deleted (consolidated into V001)
- V040+ = Next incremental migration

**Determine Next Version**:
```bash
cd apps/api/src/main/resources/db/migration
ls | grep '^V[0-9]' | sort -V | tail -1
# Output: V001__initial_schema.sql
# Next version: V040__your_feature.sql (if this is your first new migration post-squash)
```

---

## Templates

### Template 1: Create Multi-Tenant Table

**Use when**: Adding a new table that belongs to companies

```sql
-- =============================================================================
-- Feature: [Describe what this table stores]
-- Reason: [Why this change is needed]
-- Date: 2026-06-27
-- =============================================================================

-- Create table with all columns
CREATE TABLE feature (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT feature_pkey PRIMARY KEY (id),
    CONSTRAINT fk_feature_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT chk_feature_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'))
);

-- Index for filtering by company (multi-tenant scoping)
CREATE INDEX idx_feature_company ON feature(company_id);

-- Index for active records (soft-delete filtering)
CREATE INDEX idx_feature_company_active ON feature(company_id)
WHERE deleted_at IS NULL;

-- Index for status queries
CREATE INDEX idx_feature_status ON feature(company_id, status)
WHERE deleted_at IS NULL;

-- Enable Row-Level Security (mandatory for multi-tenant tables)
ALTER TABLE feature ENABLE ROW LEVEL SECURITY;

-- RLS policy: only access records for your company
CREATE POLICY rls_feature ON feature TO parkflow_app
USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

### Template 2: Add Column to Existing Table

**Use when**: Adding a field to an already-existing table

```sql
-- =============================================================================
-- Feature: Add phone_number column to app_user
-- Reason: Support contact info for user notifications
-- Date: 2026-06-27
-- =============================================================================

-- Add column with default value
ALTER TABLE app_user ADD COLUMN phone_number VARCHAR(20);

-- If column should be NOT NULL, add constraint after populating data
-- ALTER TABLE app_user ALTER COLUMN phone_number SET NOT NULL;

-- Add index if this column will be frequently queried
CREATE INDEX idx_app_user_phone ON app_user(phone_number);
```

### Template 3: Create ENUM Type

**Use when**: Column has fixed set of values

```sql
-- =============================================================================
-- Feature: Create invoice_status enum
-- Reason: Type-safe status tracking for invoices
-- Date: 2026-06-27
-- =============================================================================

-- Create enum type
CREATE TYPE invoice_status AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'REFUNDED'
);

-- Use in table definition
CREATE TABLE invoice (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    -- ... other columns
    CONSTRAINT invoice_pkey PRIMARY KEY (id),
    CONSTRAINT fk_invoice_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE
);

-- Index for status queries
CREATE INDEX idx_invoice_status ON invoice(company_id, status);
```

### Template 4: Create Global (Non-Multi-Tenant) Table

**Use when**: Data is shared across all companies (rare)

```sql
-- =============================================================================
-- Feature: Create feature_flag table for feature toggles
-- Reason: System-wide feature management
-- Date: 2026-06-27
-- =============================================================================

-- Global table (no company_id)
CREATE TABLE feature_flag (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT feature_flag_pkey PRIMARY KEY (id),
    CONSTRAINT feature_flag_code_key UNIQUE (code)
);

-- Index for lookups by code
CREATE INDEX idx_feature_flag_code ON feature_flag(code);

-- NO RLS needed (not multi-tenant)
```

### Template 5: Add Performance Index

**Use when**: Query is slow and needs an index

```sql
-- =============================================================================
-- Feature: Add composite index for parking session queries
-- Reason: Dashboard queries filter by company AND date range (slow)
-- Date: 2026-06-27
-- =============================================================================

-- Composite index: filters on both company_id and created_at
CREATE INDEX idx_parking_session_company_date ON parking_session(company_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Partial index: only active, unpaid sessions
CREATE INDEX idx_parking_session_unpaid ON parking_session(company_id, status)
WHERE status = 'UNPAID' AND deleted_at IS NULL;

-- JSONB index for log queries
CREATE INDEX idx_auth_audit_log_metadata ON auth_audit_log USING GIN(metadata_json);
```

### Template 6: Rename Column

**Use when**: Column name needs to change

```sql
-- =============================================================================
-- Feature: Rename user.phone to user.phone_number
-- Reason: Consistency with schema naming conventions
-- Date: 2026-06-27
-- =============================================================================

-- Rename column
ALTER TABLE app_user RENAME COLUMN phone TO phone_number;

-- Rename associated index (optional but good practice)
ALTER INDEX idx_app_user_phone RENAME TO idx_app_user_phone_number;
```

### Template 7: Drop Deprecated Column

**Use when**: Column is no longer used

```sql
-- =============================================================================
-- Feature: Remove deprecated `site` column from rate table
-- Reason: Site-based configuration deprecated in favor of company-based
-- Date: 2026-06-27
-- =============================================================================

-- Drop column (removes associated indexes automatically)
ALTER TABLE rate DROP COLUMN IF EXISTS site;

-- If column is referenced in RLS policies, update them first
-- Example: DROP POLICY IF EXISTS rls_rate ON rate;
-- Then recreate the policy without the site reference
```

---

## Testing Your Migration

### Step 1: Fresh Database

```bash
# Remove all volumes (clean slate)
pnpm db:down -v

# Start fresh containers
pnpm db:up

# Verify DB is empty
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# Output: 0 (empty)
```

### Step 2: Apply Migrations

```bash
cd apps/api

# Run Flyway migrations
POSTGRES_PASSWORD=parkflow ./gradlew flywayMigrate

# Expected output:
# Flyway
# Database: jdbc:postgresql://localhost:6021/parkflow_dev (PostgreSQL 16.14)
# Successfully validated 2 migrations (sql)
# Creating Flyway schema history table [public.flyway_schema_history] ...
# Current version of schema [public]: << Empty >>
# Migrating schema [public] to version 1 - Initial schema consolidation
# Migrating schema [public] to version 40 - feature name
# Successfully applied 2 migrations to schema [public] (execution time 00m 02.345s)
```

### Step 3: Verify Schema

```bash
# Count tables (should be 84 + flyway_schema_history = 85)
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# Output: 85

# Check your new table exists
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "\\d feature"  # Replace 'feature' with your table name
# Output: full table definition

# Check RLS is enabled
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='feature';"
# Output: feature | t (true = RLS enabled)
```

### Step 4: Test API

```bash
# Build API
POSTGRES_PASSWORD=parkflow ./gradlew build

# Start API
POSTGRES_PASSWORD=parkflow PARKFLOW_JWT_SECRET_BASE64="GGGuAwkgHu+Hzzw3QNsu4doUvczAowNl2ENuX+uSTsA=" \
./gradlew bootRun &

sleep 10

# Health check
curl http://localhost:6011/actuator/health
# Output: {"status":"UP"} or {"status":"DOWN"} if non-critical component failed
# Either is OK; important is API responded without exceptions

# Kill API
pkill -f "bootRun"
```

### Step 5: Check Hibernates Validation

If API started without exceptions, Hibernate schema validation passed ✅

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause**: Flyway tried to run the migration twice (checksum conflict)

**Fix**:
```bash
# Repair Flyway history
cd apps/api && ./gradlew flywayRepair

# Then re-run
./gradlew flywayMigrate
```

### Error: "ERROR: relation does not exist"

**Cause**: Trying to alter a table before creating it, or syntax error in table name

**Fix**:
1. Check column/table names match exactly (case-sensitive in some contexts)
2. Ensure CREATE TABLE happens before ALTER TABLE
3. Check for typos:
   ```bash
   # Verify table was created
   docker exec parkflow-postgres psql -U parkflow -d parkflow_dev -c "\\dt feature"
   # If empty, table wasn't created — check V001 or earlier migration
   ```

### Error: "ERROR: column type does not match"

**Cause**: Hibernate entity has `@Column(columnDefinition="TEXT")` but DB has `JSONB`

**Fix**:
1. Check Java entity in `/apps/api/src/main/java/com/parkflow/modules/`
2. Update `@Column` annotation to match DB:
   ```java
   // If DB column is JSONB
   @Column(columnDefinition = "jsonb")
   private String metadataJson;
   ```

### Error: "ERROR: constraint does not exist"

**Cause**: Trying to drop a constraint that doesn't exist

**Fix**: Use `IF EXISTS`:
```sql
-- Wrong
ALTER TABLE feature DROP CONSTRAINT feature_status_check;

-- Right
ALTER TABLE feature DROP CONSTRAINT IF EXISTS feature_status_check;
```

### Error: "Flyway validation failed"

**Cause**: Checksum mismatch (migration file was modified after commit)

**Fix**:
```bash
# Never modify committed migrations. Instead, revert and commit again:
git checkout apps/api/src/main/resources/db/migration/V040__feature.sql

# Then run repair
cd apps/api && ./gradlew flywayRepair

# Fix the migration locally, test, then commit a NEW migration
# Example: git commit -m "fix(db): correct V040 syntax"
```

---

## Common Patterns

### Pattern 1: Add New Feature with Table

```bash
# Feature: Loyalty points system
# Plan:
# - Create points_ledger table (tracks point transactions)
# - Create loyalty_account table (company's account balance)
# - Add indexes for performance

# Step 1: Create V040__add_loyalty_system.sql
cat > apps/api/src/main/resources/db/migration/V040__add_loyalty_system.sql << 'EOF'
CREATE TABLE loyalty_account (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    balance_points NUMERIC(12,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT loyalty_account_pkey PRIMARY KEY (id),
    CONSTRAINT fk_loyalty_account_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT loyalty_account_company_phone_key UNIQUE (company_id, customer_phone)
);

CREATE INDEX idx_loyalty_account_company ON loyalty_account(company_id);

ALTER TABLE loyalty_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_loyalty_account ON loyalty_account TO parkflow_app
USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE points_ledger (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    account_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    points_change NUMERIC(12,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT points_ledger_pkey PRIMARY KEY (id),
    CONSTRAINT fk_points_ledger_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_points_ledger_account FOREIGN KEY (account_id) REFERENCES loyalty_account(id) ON DELETE CASCADE,
    CONSTRAINT chk_points_ledger_type CHECK (transaction_type IN ('EARN', 'REDEEM', 'ADMIN_ADJUST'))
);

CREATE INDEX idx_points_ledger_account ON points_ledger(account_id);
CREATE INDEX idx_points_ledger_company_date ON points_ledger(company_id, created_at DESC);

ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_points_ledger ON points_ledger TO parkflow_app
USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
EOF

# Step 2: Test
pnpm db:down -v && pnpm db:up
cd apps/api && ./gradlew flywayMigrate

# Step 3: Verify
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev -c "\\dt loyalty_account"

# Step 4: Commit
git add apps/api/src/main/resources/db/migration/V040__add_loyalty_system.sql
git commit -m "feat(db): add loyalty points system tables"
```

### Pattern 2: Performance Tuning (Add Missing Index)

```bash
# Issue: Dashboard query is slow
# SELECT * FROM parking_session WHERE company_id = $1 AND created_at > $2

# Solution: Create composite index
cat > apps/api/src/main/resources/db/migration/V041__add_session_performance_index.sql << 'EOF'
-- Performance optimization: Dashboard queries filter by company AND date
CREATE INDEX idx_parking_session_company_date 
ON parking_session(company_id, created_at DESC)
WHERE deleted_at IS NULL;
EOF

# Test, commit
```

---

## Migration Checklist

Before committing a migration, verify:

- [ ] **Version number is correct** (determined via `ls | sort -V | tail -1`)
- [ ] **File name follows pattern**: `V{number}__{description}.sql` (lowercase, underscores)
- [ ] **SQL syntax is valid** (tested on fresh DB)
- [ ] **Multi-tenant tables have**:
  - [ ] `company_id UUID NOT NULL`
  - [ ] FK: `REFERENCES companies(id) ON DELETE CASCADE`
  - [ ] Index: `CREATE INDEX idx_<table>_company ON <table>(company_id)`
  - [ ] RLS: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`
  - [ ] Policy: `CREATE POLICY rls_<table> ON <table> TO parkflow_app USING (...)`
- [ ] **Column constraints are correct**:
  - [ ] PKs defined
  - [ ] UKs defined where needed (e.g., email, code)
  - [ ] FKs defined with ON DELETE CASCADE
  - [ ] CHECK constraints for bounded values
- [ ] **Indexes are optimized**:
  - [ ] FKs have indexes
  - [ ] Frequently-queried columns have indexes
  - [ ] Partial indexes on soft-deleted rows (if applicable)
- [ ] **No references to deleted migrations** (V002-V039 don't exist)
- [ ] **No modifications to V001** (immutable baseline)
- [ ] **Migration runs successfully on fresh DB**:
  - [ ] `pnpm db:down -v && pnpm db:up`
  - [ ] `./gradlew flywayMigrate` succeeds
  - [ ] `./gradlew bootRun` starts without exceptions
- [ ] **Commit message is descriptive**:
  - [ ] `feat(db)` for new tables
  - [ ] `fix(db)` for schema corrections
  - [ ] `perf(db)` for performance indexes
  - [ ] Example: `feat(db): add loyalty points system with RLS`

---

## References

- **Database Architecture**: [DATABASE.md](DATABASE.md)
- **Operations & Disaster Recovery**: [OPERATIONS.md](OPERATIONS.md)
- **Flyway Docs**: https://flywaydb.org/documentation/
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Main Development Guide**: [CLAUDE.md](../CLAUDE.md) → "Database Migration Strategy"
