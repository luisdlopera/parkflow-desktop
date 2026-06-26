# Production Readiness Checklist

**Document Version**: 1.0  
**Date**: 2026-06-25  
**Scope**: Pre-deployment verification, production deployment, and rollback procedures

---

## Pre-Deployment (72 hours before)

### Code Quality Verification
- [ ] All PR reviews approved with no "Request Changes"
- [ ] Branch passes CI/CD pipeline (green checkmarks)
- [ ] Test coverage ≥60% (Backend) / ≥60% (Frontend)
- [ ] SonarCloud quality gate: PASSED
- [ ] No new critical vulnerabilities (CVSS ≥9.0)
- [ ] Zero high-priority security findings from ZAP baseline

**Verification Command**:
```bash
# Backend
cd apps/api && gradle build && gradle test && gradle sonarqube

# Frontend
cd apps/web && pnpm build && pnpm test:web && pnpm build

# Security scan
pnpm security:deps
```

### Dependency Audit
- [ ] No unpatched critical vulnerabilities in `pnpm audit`
- [ ] All transitive dependencies pinned (not "latest")
- [ ] No deprecated packages in use
- [ ] License compliance checked (Apache 2.0, MIT, BSD approved)

```bash
pnpm audit --audit-level=high
pnpm deps:check
```

### Documentation Verification
- [ ] CHANGELOG.md updated with release notes
- [ ] README.md reflects new features/changes
- [ ] API Swagger docs generated and reviewed
- [ ] Database migrations documented in `/docs/migrations/`
- [ ] Breaking changes listed in MIGRATION_GUIDE.md (if any)

### Database Safety
- [ ] Migrations reviewed and tested locally
- [ ] Rollback migration exists for every forward migration
- [ ] No destructive operations (DROP TABLE) without approval
- [ ] Backup strategy documented for production
- [ ] RLS policies verified on multi-tenant tables

**Test Migrations**:
```bash
# Dry-run migrations
flyway:info -Dflyway.sqlMigrationPrefix=V

# Rollback simulation (local only)
# DROP TABLE <table>; -- Verify migrations rebuild it
```

---

## Pre-Production (24 hours before)

### Infrastructure Readiness
- [ ] Production database provisioned and accessible
- [ ] Redis cache cluster configured
- [ ] CDN configured (if applicable)
- [ ] Load balancer health check endpoints accessible
- [ ] SSL/TLS certificates valid (not expired)
- [ ] DNS records updated (if domain changed)

**Verification**:
```bash
# Test database connectivity
psql postgresql://<user>:<pass>@<host>:<port>/<db> -c "SELECT version();"

# Test Redis
redis-cli -h <redis-host> PING

# Test SSL
openssl s_client -connect <api-host>:443 < /dev/null
```

### API Contract Testing
- [ ] 39 API contract tests pass (see `docs/api-contract-tests.md`)
- [ ] OpenAPI spec version bumped if breaking changes
- [ ] All endpoints have examples in Swagger
- [ ] Rate limiting thresholds configured for production load

**Run Contract Tests**:
```bash
cd apps/api
gradle test --tests "*ContractTest"  # 39 tests
```

### Monitoring & Alerting
- [ ] Application Performance Monitoring (APM) configured
- [ ] Error tracking (Sentry) integrated
- [ ] Logging aggregation (ELK/Datadog) configured
- [ ] Alert rules created for critical metrics:
  - [ ] API error rate > 5%
  - [ ] Database connection pool exhaustion
  - [ ] Cache miss rate spike
  - [ ] Disk usage > 80%
  - [ ] Memory usage > 85%
  - [ ] Authentication failure spike (possible attack)

### Secrets Management
- [ ] All credentials rotated (JWT secret, API keys, DB passwords)
- [ ] Secrets stored in secure vault (AWS Secrets Manager, HashiCorp Vault)
- [ ] No secrets in `.env`, `CHANGELOG`, or version control
- [ ] Audit log shows secret rotation completed

```bash
# Verify no secrets in repo
git log --oneline --all | grep -i "secret\|password\|key"  # Should be 0 results
grep -r "password" .env.example  # Should show placeholder, not real password
```

---

## Deployment (Execution Day)

### Pre-Deployment Checks (30 minutes before)
- [ ] Rollback plan reviewed with team
- [ ] Runbook printed and distributed
- [ ] On-call engineer standing by
- [ ] Maintenance window communicated to users
- [ ] Backup taken (database + application state)

```bash
# Backup production database
pg_dump -h <prod-host> -U <user> <db> > parkflow_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
pg_restore -d parkflow_test < parkflow_*.sql  # Test restore on staging
```

### Deployment Execution
- [ ] **1. Stop application traffic**
  ```bash
  # Drain load balancer
  aws elb deregister-instances-from-load-balancer \
    --load-balancer-name parkflow-api \
    --instances i-1234567890abcdef0
  ```

- [ ] **2. Deploy new code**
  ```bash
  # Backend
  cd apps/api
  gradle build -x test  # Skip tests (already passed in CI)
  docker build -t parkflow-api:v2.5.0 .
  docker push parkflow-api:v2.5.0
  
  # Frontend
  cd apps/web
  pnpm build
  # Upload to CDN/S3
  aws s3 sync dist/ s3://parkflow-web-prod/v2.5.0/
  ```

- [ ] **3. Run database migrations**
  ```bash
  # Apply forward migrations
  flyway:migrate -Dflyway.baselineVersion=0
  
  # Verify all migrations applied
  flyway:info | grep -c "Success"  # Should equal # of new migrations
  ```

- [ ] **4. Smoke test application**
  ```bash
  # Test API
  curl -H "Authorization: Bearer $TEST_TOKEN" \
    http://localhost:6011/api/v1/auth/me
  
  # Expected: 200 OK with user data
  
  # Test frontend
  curl -H "User-Agent: bot" http://localhost:6001/
  # Expected: 200 OK HTML response
  ```

- [ ] **5. Re-enable traffic**
  ```bash
  aws elb register-instances-with-load-balancer \
    --load-balancer-name parkflow-api \
    --instances i-1234567890abcdef0
  ```

### Post-Deployment Verification (1 hour)
- [ ] Application accessible from browsers
- [ ] API returning 200 OK for health check
- [ ] Error rate < 1%
- [ ] Database connections stable
- [ ] Cache hit rate normal
- [ ] No user-facing errors reported

**Monitoring Dashboard Commands**:
```bash
# Watch real-time errors
# (connect to error tracking dashboard)

# Check application logs
tail -f /var/log/parkflow/api.log | grep ERROR

# Monitor database
psql <db> -c "SELECT datname, count(*) as sessions FROM pg_stat_activity GROUP BY datname;"

# Monitor cache
redis-cli INFO stats | grep hits
```

---

## Rollback (If Needed)

### Decision Criteria
Rollback if within 1 hour of deployment AND:
- Error rate > 10% consistently
- API response time > 5 seconds (p95)
- Database queries failing
- Authentication broken
- Data corruption detected

### Rollback Steps
1. **Stop new code immediately**
   ```bash
   docker stop parkflow-api
   ```

2. **Restore database from backup**
   ```bash
   # Stop app first
   # Restore from timestamped backup
   pg_restore -d parkflow -f parkflow_backup_$(date).sql
   
   # Verify restore
   psql parkflow -c "SELECT COUNT(*) FROM parking_session;"
   ```

3. **Deploy previous version**
   ```bash
   docker run -d \
     -e DATABASE_URL=<prod-db> \
     parkflow-api:v2.4.1  # Previous stable version
   
   # Run backward migrations
   flyway:undo -Dflyway.target=V<last-stable>
   ```

4. **Verify previous version works**
   ```bash
   curl http://localhost:6011/api/v1/auth/me
   # Should return 200 OK
   ```

5. **Post-incident**
   - [ ] Create incident report
   - [ ] Schedule post-mortem
   - [ ] Update runbook with lessons learned
   - [ ] Add regression tests for bug that broke

---

## Post-Deployment (24+ hours)

### Stability Monitoring
- [ ] No errors in logs for 4+ hours
- [ ] Error rate stabilized at < 0.5%
- [ ] Database query times normal
- [ ] No user complaints reported
- [ ] Performance metrics within expected ranges

### Long-Term Verification
- [ ] RLS policies working correctly (multi-tenant data isolated)
- [ ] Audit logs recording all operations
- [ ] Backups completing successfully
- [ ] Security scans run successfully (no new vulnerabilities)

---

## Deployment Checklist (Summary)

### 72 Hours Before
```
[ ] Code quality: 60%+ coverage, SonarCloud PASS
[ ] Dependencies: No high-severity vulnerabilities
[ ] Documentation: CHANGELOG, Swagger, migration docs updated
[ ] Database: Migrations tested, rollback plans ready
```

### 24 Hours Before
```
[ ] Infrastructure: Production DB, Redis, DNS ready
[ ] API contracts: 39 tests passing
[ ] Monitoring: APM, alerts, logging configured
[ ] Secrets: Rotated and secured
```

### Deployment Day
```
[ ] Backups taken
[ ] Application stopped (clean shutdown)
[ ] Code deployed
[ ] Database migrations applied
[ ] Smoke tests passed
[ ] Traffic re-enabled
[ ] Post-deployment verification done
```

### After Deployment
```
[ ] Error logs reviewed (0 critical errors)
[ ] Health checks passing
[ ] Performance normal
[ ] Users report no issues
```

---

## Release Notes Template

Create `docs/releases/v<version>.md` with:

```markdown
# Release Notes: v2.5.0

**Release Date**: June 25, 2026  
**Status**: Production  

## New Features
- Add capacity management endpoint (issue #234)
- Enable RLS on multi-tenant tables (security hardening)

## Bug Fixes
- Fix rate calculation rounding error
- Correct timezone handling in reports

## Breaking Changes
- `POST /api/v1/settings/rates` deprecated → use `POST /api/v1/configuration/rates`
  - Deprecation timeline: Jun 30 (warning), Jul 7 (removed)
- `GET /api/v1/parking/sessions` now requires `company_id` query param

## Upgrade Instructions
1. Backup production database
2. Deploy application (blue-green)
3. Run migrations: `flyway:migrate`
4. Verify health: `curl /actuator/health`

## Known Issues
- None

## Security
- Fixed SQLi vulnerability in search module (CWE-89)
- Updated dependencies for log4j CVE
```

---

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| On-Call Engineer | [TBD] | [TBD] | @on-call |
| Operations Lead | [TBD] | [TBD] | @ops-lead |
| Security Lead | [TBD] | [TBD] | @security |
| Database Admin | [TBD] | [TBD] | @dba |

---

## Related Documentation

- [Deployment Runbook](runbooks/deployment-runbook.md)
- [Rollback Strategy](runbooks/rollback-strategy.md)
- [API Contract Tests](api-contract-tests.md)
- [Performance Baseline](performance-baseline.md)
- [Security Audit](security-audit.md)

---

**Last Updated**: 2026-06-25  
**Owner**: DevOps / Release Engineering  
**Next Review**: 2026-07-23 (Post-launch retrospective)
