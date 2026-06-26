# Database Operations & Maintenance

## Overview

This guide covers operational tasks for the ParkFlow database: backup, restore, monitoring, and disaster recovery.

---

## Regular Backups

### Manual Backup

```bash
# Full backup (schema + data)
docker exec parkflow-postgres pg_dump -U parkflow parkflow_dev \
    --format=custom \
    --compress=9 \
    -f backup_$(date +%Y%m%d_%H%M%S).dump

# Location: current directory (e.g., backup_20260626_120000.dump)
# Size: ~10-50MB compressed (depends on data volume)
```

### Backup Locations

**Development**:
```bash
# Backup to project directory
cd /Users/luisdlopera/Documents/projects/cv/parkflow-desktop
docker exec parkflow-postgres pg_dump -U parkflow parkflow_dev > backups/parkflow_dev_$(date +%Y%m%d).dump
```

**Production** (when applicable):
```bash
# Backup to secure location with rotation
BACKUP_DIR="/backups/parkflow/$(date +%Y/%m)"
mkdir -p "$BACKUP_DIR"

docker exec parkflow-postgres pg_dump -U parkflow parkflow_prod \
    --format=custom \
    --compress=9 \
    -f "$BACKUP_DIR/parkflow_prod_$(date +%Y%m%d_%H%M%S).dump"

# Keep only 30 days of backups
find /backups/parkflow -type f -mtime +30 -delete
```

### Automated Backup (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /Users/luisdlopera/Documents/projects/cv/parkflow-desktop && \
    docker exec parkflow-postgres pg_dump -U parkflow parkflow_dev > backups/daily_$(date +\%Y\%m\%d).dump && \
    find backups -name "daily_*" -mtime +7 -delete

# List scheduled backups
crontab -l
```

---

## Restore from Backup

### Restore to Fresh Database

```bash
# 1. Start clean database
pnpm db:down -v
pnpm db:up

# 2. Wait for PostgreSQL to be healthy
sleep 5

# 3. Restore backup
docker exec -i parkflow-postgres pg_restore -U parkflow \
    -d parkflow_dev \
    --verbose \
    < backup_20260626_120000.dump

# 4. Verify restore
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# Should match original table count (85)
```

### Restore to Existing Database (With Data Loss)

```bash
# ⚠️ WARNING: This OVERWRITES existing data

# 1. Drop all tables
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Restore backup
docker exec -i parkflow-postgres pg_restore -U parkflow \
    -d parkflow_dev \
    < backup_20260626_120000.dump

# 3. Verify
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT version FROM flyway_schema_history ORDER BY version DESC LIMIT 1;"
```

### Point-in-Time Recovery (PITR)

```bash
# ⚠️ Requires WAL archiving (not configured by default)

# 1. List available WAL files
docker exec parkflow-postgres ls -la /var/lib/postgresql/data/pg_wal/

# 2. Restore to specific time
docker exec parkflow-postgres pg_restore -U parkflow \
    -d parkflow_dev_recovered \
    -t 2026-06-26T12:00:00 \
    < backup_20260626_120000.dump
```

---

## Disaster Recovery Scenarios

### Scenario 1: Database Corrupted

**Symptoms**: Errors like "ERROR: relation does not exist", orphaned indexes

**Recovery**:
```bash
# Step 1: Stop API
pkill -f "bootRun"

# Step 2: Backup corrupted DB (for investigation)
docker exec parkflow-postgres pg_dump -U parkflow parkflow_dev > corrupted_backup.dump

# Step 3: Drop corrupted database
docker exec parkflow-postgres psql -U parkflow -d postgres \
    -c "DROP DATABASE parkflow_dev;"

# Step 4: Create fresh database
docker exec parkflow-postgres psql -U parkflow -d postgres \
    -c "CREATE DATABASE parkflow_dev;"

# Step 5: Restore from good backup
docker exec -i parkflow-postgres pg_restore -U parkflow \
    -d parkflow_dev \
    < good_backup.dump

# Step 6: Start API (migrations will re-validate schema)
cd apps/api && ./gradlew bootRun
```

### Scenario 2: Migration Failed Mid-Way

**Symptoms**: Flyway checksum error, partial schema changes

**Recovery**:
```bash
# Option A: Revert code + wipe DB
git revert <failed-commit-hash>
pnpm db:down -v
pnpm db:up
cd apps/api && ./gradlew flywayMigrate

# Option B: Repair Flyway and restore backup
cd apps/api && ./gradlew flywayRepair
docker exec -i parkflow-postgres pg_restore -U parkflow \
    -d parkflow_dev \
    < backup_before_migration.dump
```

### Scenario 3: Accidental Data Deletion

**Symptoms**: Important records missing, but DB still functional

**Recovery**:
```bash
# 1. Check last good backup timestamp
ls -lh backup_*.dump | tail -5

# 2. Restore to temporary DB
docker exec parkflow-postgres psql -U parkflow -d postgres \
    -c "CREATE DATABASE parkflow_recovery;"

docker exec -i parkflow-postgres pg_restore -U parkflow \
    -d parkflow_recovery \
    < backup_before_deletion.dump

# 3. Extract missing data from recovery DB
docker exec parkflow-postgres psql -U parkflow -d parkflow_recovery \
    -c "SELECT * FROM table_name WHERE id = '...';" > missing_data.sql

# 4. Re-insert into production DB
docker exec -i parkflow-postgres psql -U parkflow -d parkflow_dev < missing_data.sql

# 5. Clean up recovery DB
docker exec parkflow-postgres psql -U parkflow -d postgres \
    -c "DROP DATABASE parkflow_recovery;"
```

### Scenario 4: Container Crash

**Symptoms**: Database container won't start, or is stuck

**Recovery**:
```bash
# Step 1: Check container logs
docker logs parkflow-postgres | tail -50

# Step 2: Restart container
docker restart parkflow-postgres

# Step 3: If still failing, force recreate
pnpm db:down -v
pnpm db:up

# Step 4: Restore from backup if data was lost
docker exec -i parkflow-postgres pg_restore -U parkflow \
    -d parkflow_dev \
    < backup_20260626_120000.dump
```

---

## Monitoring & Health Checks

### Database Health

```bash
# Connection pool status
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT count(*) as connection_count FROM pg_stat_activity;"

# Table sizes
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables WHERE schemaname='public' 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Index efficiency (unused indexes)
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT schemaname, tablename, indexname, idx_scan
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        ORDER BY pg_relation_size(indexrelid) DESC;"

# RLS policy status (verify multi-tenant protection)
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT tablename, rowsecurity FROM pg_tables 
        WHERE schemaname='public' AND rowsecurity=false;"
# Output should be empty (all tables have RLS)
```

### Flyway History

```bash
# Check migration status
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT version, description, type, installed_on, execution_time, success 
        FROM flyway_schema_history 
        ORDER BY version DESC 
        LIMIT 10;"

# Verify all migrations succeeded
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT count(*) as failed_migrations FROM flyway_schema_history WHERE success=false;"
# Output: 0 (means all successful)
```

### API Integration Tests

```bash
# Quick health check
curl http://localhost:6011/actuator/health

# Check database connectivity in API
docker logs parkflow-api 2>&1 | grep -i "hibernate\|jpa\|database"
```

---

## Performance Tuning

### Analyze Query Performance

```bash
# Run ANALYZE to update statistics
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "ANALYZE;"

# Explain slow query
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "EXPLAIN ANALYZE 
        SELECT * FROM parking_session 
        WHERE company_id = '...' 
        AND created_at > NOW() - INTERVAL '7 days' 
        AND deleted_at IS NULL;"
```

### Maintenance Commands

```bash
# Vacuum (clean up dead rows)
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "VACUUM ANALYZE;"

# Reindex (rebuild indexes)
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "REINDEX DATABASE parkflow_dev;"

# Check database integrity
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "PRAGMA integrity_check;" 2>/dev/null || echo "Not SQLite, use other tools"
```

---

## Security & Access Control

### User Management

```bash
# List database users
docker exec parkflow-postgres psql -U postgres \
    -c "SELECT usename, usesuper, usecreatedb FROM pg_user;"

# Create read-only user (for reporting)
docker exec parkflow-postgres psql -U postgres \
    -c "CREATE USER reporter WITH PASSWORD 'secure_password';
        GRANT CONNECT ON DATABASE parkflow_dev TO reporter;
        GRANT USAGE ON SCHEMA public TO reporter;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporter;"

# Revoke all access from a user
docker exec parkflow-postgres psql -U postgres \
    -c "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM reporter;
        DROP USER reporter;"
```

### RLS Verification

```bash
# List all RLS policies
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SELECT schemaname, tablename, policyname FROM pg_policies;"

# Test RLS policy (as parkflow_app role)
docker exec parkflow-postgres psql -U parkflow -d parkflow_dev \
    -c "SET ROLE parkflow_app;
        SET app.tenant_id = '00000000-0000-0000-0000-000000000001';
        SELECT count(*) FROM vehicle;
        RESET ROLE;"
```

---

## Backup Verification

### Before Production Deploy

```bash
# 1. Backup current database
docker exec parkflow-postgres pg_dump -U parkflow parkflow_dev > pre_deploy_backup.dump

# 2. Test restore on a fresh container
docker run --name test-db -e POSTGRES_DB=parkflow_dev -e POSTGRES_USER=parkflow -e POSTGRES_PASSWORD=parkflow postgres:16 &
sleep 10

docker exec -i test-db pg_restore -U parkflow \
    -d parkflow_dev \
    < pre_deploy_backup.dump

# 3. Verify restore
docker exec test-db psql -U parkflow -d parkflow_dev \
    -c "SELECT count(*) FROM information_schema.tables;"

# 4. Clean up test container
docker stop test-db && docker rm test-db
```

---

## Maintenance Checklist

### Daily
- [ ] Check database container is running: `docker ps | grep parkflow-postgres`
- [ ] Verify API can connect to DB: `curl http://localhost:6011/actuator/health`

### Weekly
- [ ] Backup database: `pg_dump ... > backup_$(date +%Y%m%d).dump`
- [ ] Check table sizes: `SELECT ... FROM pg_tables ... ORDER BY pg_total_relation_size DESC`
- [ ] Verify RLS is enabled on all multi-tenant tables

### Monthly
- [ ] Run ANALYZE: `VACUUM ANALYZE;`
- [ ] Check for unused indexes: `SELECT ... FROM pg_stat_user_indexes WHERE idx_scan = 0`
- [ ] Test backup restore on fresh container
- [ ] Review Flyway migration history: `SELECT * FROM flyway_schema_history`

### Before Production Release
- [ ] Full backup created and tested
- [ ] RLS policies verified on all new tables
- [ ] Index performance tuned
- [ ] Multi-tenant isolation verified

---

## Emergency Contacts & Escalation

### If Database is Down

1. **Check container**: `docker ps | grep postgres`
2. **Check logs**: `docker logs parkflow-postgres | tail -50`
3. **Restart if needed**: `pnpm db:down && pnpm db:up`
4. **Restore from backup**: See "Scenario 4: Container Crash" above
5. **Notify team** if data loss suspected

### Production Incident Protocol

1. **Stop API**: `pkill -f "bootRun"` (prevents further damage)
2. **Backup corrupted DB**: `pg_dump ... > incident_backup_$(date +%s).dump`
3. **Assess**: Determine if data can be recovered
4. **Restore**: Use latest good backup
5. **Verify**: Run test suite against restored DB
6. **Notify**: Document what happened and recovery steps

---

## Reference

- [Backup & Restore Guide](https://www.postgresql.org/docs/current/backup.html)
- [Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Security](https://www.postgresql.org/docs/current/sql-security.html)
