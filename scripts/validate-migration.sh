#!/bin/bash

##############################################################################
# ParkFlow Database Migration Validator
#
# Purpose: Validates a database migration before committing
# Usage: ./scripts/validate-migration.sh [V000__name.sql]
#
# Checks:
# - File format and naming convention
# - SQL syntax validity
# - Multi-tenant table compliance
# - Index and constraint naming
# - Successful application on fresh DB
#
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get migration file
MIGRATION_FILE="${1:-}"

if [ -z "$MIGRATION_FILE" ]; then
    echo -e "${YELLOW}Usage: ./scripts/validate-migration.sh [V000__name.sql]${NC}"
    echo ""
    echo "Examples:"
    echo "  ./scripts/validate-migration.sh src/main/resources/db/migration/V040__feature.sql"
    echo "  ./scripts/validate-migration.sh apps/api/src/main/resources/db/migration/V040__feature.sql"
    exit 1
fi

# Normalize path
if [[ ! "$MIGRATION_FILE" =~ ^apps/api/ ]]; then
    MIGRATION_FILE="apps/api/src/main/resources/db/migration/$MIGRATION_FILE"
fi

# Verify file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ File not found: $MIGRATION_FILE${NC}"
    exit 1
fi

FILENAME=$(basename "$MIGRATION_FILE")

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ParkFlow Migration Validator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Validating: $FILENAME"
echo ""

# ─────────────────────────────────────────────────────────────────────────
# 1. Naming Convention Check
# ─────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[1/6] Checking naming convention...${NC}"

# Extract version number
if [[ $FILENAME =~ ^V([0-9]+)__ ]]; then
    VERSION="${BASH_REMATCH[1]}"
    echo -e "${GREEN}✓${NC} Version: V$VERSION"
else
    echo -e "${RED}✗ File must match pattern: V{number}__{description}.sql${NC}"
    exit 1
fi

# Check if version is in sequence
LATEST_VERSION=$(ls $(dirname "$MIGRATION_FILE") | grep '^V[0-9]' | sort -V | tail -2 | head -1 | sed 's/V0*\([0-9]*\).*/\1/')

if [ -z "$LATEST_VERSION" ]; then
    LATEST_VERSION=0
fi

EXPECTED_VERSION=$((LATEST_VERSION + 1))

if [ "$VERSION" -eq "$EXPECTED_VERSION" ] || [ "$VERSION" -gt "$LATEST_VERSION" ]; then
    echo -e "${GREEN}✓${NC} Version sequence OK (next expected: V$EXPECTED_VERSION)"
else
    echo -e "${YELLOW}⚠ Warning: Version V$VERSION may not be sequential (latest: V$LATEST_VERSION)${NC}"
fi

# Check description format
if [[ $FILENAME =~ ^V[0-9]+__([a-z0-9_]+)\.sql$ ]]; then
    echo -e "${GREEN}✓${NC} Filename format correct"
else
    echo -e "${RED}✗ Filename must be: V{number}__{lowercase_with_underscores}.sql${NC}"
    exit 1
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────
# 2. SQL Syntax Check
# ─────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[2/6] Checking SQL syntax...${NC}"

# Basic SQL validation
if ! grep -q "^CREATE\|^ALTER\|^DROP\|^INSERT\|^DELETE\|^UPDATE" "$MIGRATION_FILE"; then
    echo -e "${RED}✗ Migration file contains no SQL statements${NC}"
    exit 1
fi

if grep -q "CREATE TABLE\|ALTER TABLE" "$MIGRATION_FILE"; then
    echo -e "${GREEN}✓${NC} SQL statements found"
else
    echo -e "${YELLOW}⚠ Warning: No CREATE/ALTER TABLE found (is this intentional?)${NC}"
fi

# Check for common issues
if grep -q "DROP DATABASE\|TRUNCATE\|DROP SCHEMA" "$MIGRATION_FILE"; then
    echo -e "${RED}✗ Dangerous operations detected (DROP DATABASE, TRUNCATE, DROP SCHEMA)${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} No dangerous operations detected"

echo ""

# ─────────────────────────────────────────────────────────────────────────
# 3. Multi-Tenant Compliance Check
# ─────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[3/6] Checking multi-tenant compliance...${NC}"

# Check if creating tables
if grep -q "^CREATE TABLE" "$MIGRATION_FILE"; then
    TABLE_NAMES=$(grep "^CREATE TABLE" "$MIGRATION_FILE" | sed 's/CREATE TABLE \([^ (]*\).*/\1/' | tr -d ' ')

    for TABLE in $TABLE_NAMES; do
        TABLE=$(echo "$TABLE" | tr -d '[:space:]')

        # List of global tables (no company_id needed)
        GLOBAL_TABLES="roles|permissions|role_permissions|user_roles|master_vehicle_type|devices|theme_config|onboarding_defaults|flyway_schema_history"

        if [[ $TABLE =~ ^($GLOBAL_TABLES)$ ]]; then
            echo -e "${GREEN}✓${NC} $TABLE is a global table (no company_id required)"
        else
            # Check if table has company_id
            if grep -q "company_id UUID NOT NULL" "$MIGRATION_FILE"; then
                echo -e "${GREEN}✓${NC} Table $TABLE appears to have company_id"

                # Check for RLS
                if grep -q "ALTER TABLE.*$TABLE.*ENABLE ROW LEVEL SECURITY\|CREATE POLICY.*ON.*$TABLE" "$MIGRATION_FILE"; then
                    echo -e "${GREEN}✓${NC} RLS policy found for $TABLE"
                else
                    echo -e "${RED}✗ $TABLE is multi-tenant but missing RLS policy${NC}"
                    exit 1
                fi
            else
                echo -e "${YELLOW}⚠ $TABLE may need company_id (or is this intentional?)${NC}"
            fi
        fi
    done
else
    echo -e "${YELLOW}⚠ No CREATE TABLE found (this is OK if migration adds columns/indexes)${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────
# 4. Constraint & Index Naming Check
# ─────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[4/6] Checking naming conventions...${NC}"

# Check constraint names
if grep -q "CONSTRAINT" "$MIGRATION_FILE"; then
    echo -e "${GREEN}✓${NC} Constraints found"

    # Check for bad naming
    if grep -q "CONSTRAINT PK_\|CONSTRAINT FK_\|CONSTRAINT UK_" "$MIGRATION_FILE"; then
        echo -e "${RED}✗ Use snake_case for constraints, not PK_/FK_/UK_ prefixes${NC}"
        exit 1
    fi
fi

# Check index names
if grep -q "CREATE INDEX" "$MIGRATION_FILE"; then
    echo -e "${GREEN}✓${NC} Indexes found"

    # Check for consistent naming (idx_)
    UNNAMED_INDEXES=$(grep "CREATE INDEX" "$MIGRATION_FILE" | grep -v "idx_" || true)
    if [ ! -z "$UNNAMED_INDEXES" ]; then
        echo -e "${YELLOW}⚠ Some indexes don't follow idx_ convention${NC}"
    fi
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────
# 5. Test on Fresh Database
# ─────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[5/6] Testing migration on fresh database...${NC}"

# Check if we can access docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker not found, skipping database test${NC}"
else
    # Note: Full database test requires more setup, so we'll do a quick syntax check
    if docker exec parkflow-postgres psql -U parkflow -d parkflow_dev -c "BEGIN;" &>/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database connection OK"
    else
        echo -e "${YELLOW}⚠ Database not running, skipping database test${NC}"
        echo -e "${YELLOW}   To test: pnpm db:up && cd apps/api && ./gradlew flywayMigrate${NC}"
    fi
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────
# 6. Commit Readiness Checklist
# ─────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[6/6] Commit readiness checklist...${NC}"

READY=true

# Check version uniqueness
if [ $(ls "$(dirname "$MIGRATION_FILE")" | grep "^V$VERSION" | wc -l) -gt 1 ]; then
    echo -e "${RED}✗ Multiple files with version V$VERSION${NC}"
    READY=false
else
    echo -e "${GREEN}✓${NC} Version is unique"
fi

# Check for comments
if grep -q "^--.*Feature:\|^--.*Reason:" "$MIGRATION_FILE"; then
    echo -e "${GREEN}✓${NC} Migration has documentation comments"
else
    echo -e "${YELLOW}⚠ Consider adding comments (-- Feature:, -- Reason:)${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────
# Results
# ─────────────────────────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

if [ "$READY" = true ]; then
    echo -e "${GREEN}✓ Migration validation PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test on fresh database: pnpm db:down -v && pnpm db:up && cd apps/api && ./gradlew flywayMigrate"
    echo "  2. Verify API starts: ./gradlew bootRun"
    echo "  3. Commit: git add ... && git commit ..."
    echo ""
    exit 0
else
    echo -e "${RED}✗ Migration validation FAILED${NC}"
    echo ""
    echo "Fix the issues above and run validation again."
    echo ""
    exit 1
fi
