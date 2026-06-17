# Deployment Readiness Checklist

**Project**: ParkFlow Onboarding-to-Configuration Editability  
**Target**: Staging Environment  
**Date**: 2026-06-16

---

## Pre-Deployment Validation (15 minutes)

### Code Quality ✅
- [x] All source files compile without errors
  ```bash
  cd apps/api && ./gradlew classes
  cd ../web && npm run build:web
  ```
- [x] No console.error or console.warn in production code
- [x] No TODO/FIXME comments in code
- [x] Code follows existing project patterns

### Build & Compilation ✅
- [x] Backend: `gradle build` → SUCCESS
- [x] Frontend: `npm run build:web` → SUCCESS
- [x] No TypeScript errors
- [x] No ESLint warnings

### Server Verification ✅
- [x] Web server running on port 6001/6002
- [x] API server running on port 6011
- [x] Both servers responding to health checks
  ```bash
  curl http://localhost:6001  # Web
  curl http://localhost:6011/actuator/health  # API
  ```

### Manual Testing (20 minutes)
Follow [docs/MANUAL_TEST_CHECKLIST.md](MANUAL_TEST_CHECKLIST.md)
- [ ] Test 1: Access Configuration UI
- [ ] Test 2: Load & Display Configuration
- [ ] Test 3: Update Configuration
- [ ] Test 4: Modules Tab
- [ ] Test 5: Error Handling
- [ ] Test 6: Network Simulation
- [ ] Test 7: Tab Switching

### API Endpoint Validation (5 minutes)
Run automated validation script:
```bash
bash scripts/validate-config-endpoints.sh
```
Expected output: ✓ All endpoints are responding correctly!

---

## Staging Deployment Steps

### 1. Pre-Deployment Checklist
- [ ] All tests in this document have passed
- [ ] Code has been reviewed by team lead
- [ ] Security review completed
- [ ] Database backups are current
- [ ] Deployment plan reviewed with ops team

### 2. Deploy Backend API

```bash
# Step 1: Build production JAR
cd apps/api
./gradlew build -Pprod

# Step 2: Run database migrations
java -jar build/libs/parkflow-api.jar \
  --spring.profiles.active=staging \
  --spring.liquibase.enabled=true

# Step 3: Deploy JAR to staging
# (Use your deployment pipeline, e.g., Docker, ECS, K8s)
aws ecs update-service \
  --cluster parkflow-staging \
  --service parkflow-api \
  --force-new-deployment

# Step 4: Verify API is responding
curl -v https://api-staging.parkflow.com/actuator/health
```

### 3. Deploy Frontend Web App

```bash
# Step 1: Build production bundle
cd apps/web
npm run build:web

# Step 2: Deploy to CDN (AWS S3/CloudFront, Vercel, Netlify)
# Option A: AWS S3
aws s3 sync .next s3://parkflow-staging-web/.next --delete

# Option B: Vercel (automatic on git push)
git push origin main

# Step 3: Verify web is accessible
curl -v https://staging.parkflow.com
```

### 4. Post-Deployment Verification

**Health Checks** (all should return 200):
```bash
# API health
curl https://api-staging.parkflow.com/actuator/health

# Web accessibility
curl -I https://staging.parkflow.com

# Configuration endpoints
curl -H "Authorization: Bearer {STAGING_TOKEN}" \
  https://api-staging.parkflow.com/api/v1/configuration/capacity?companyId={TEST_COMPANY}
```

**Smoke Tests** (5 minutes):
1. Login to staging: https://staging.parkflow.com
2. Navigate to `/configuracion?section=setup`
3. Verify 4 sections load: Capacidad, Turnos, Región, Cascos
4. Click "Módulos" tab
5. Verify module toggles display with lock icons for restricted features

**Error Scenario Tests**:
1. Try invalid input (e.g., capacity = 0) → Should show error
2. Try without authentication → Should redirect to login
3. Try with expired token → Should show authentication error

---

## Rollback Plan

If deployment fails or causes issues:

### Immediate Rollback (< 5 minutes)

**Option 1: Revert to Previous API Version**
```bash
# Redeploy previous image
aws ecs update-service \
  --cluster parkflow-staging \
  --service parkflow-api \
  --task-definition parkflow-api:PREVIOUS_VERSION

# Verify previous version is healthy
curl -v https://api-staging.parkflow.com/actuator/health
```

**Option 2: Revert to Previous Web Version**
```bash
# Revert S3 to previous build
aws s3 sync s3://parkflow-staging-web-backup/.next s3://parkflow-staging-web/.next --delete

# Clear CloudFront cache
aws cloudfront create-invalidation --distribution-id {CF_ID} --paths "/*"
```

### If Rollback Needed
1. Execute rollback steps above (< 5 min)
2. Verify system is healthy
3. Post-mortem: Identify root cause
4. Fix issue in dev environment
5. Re-test thoroughly
6. Schedule new deployment

---

## Monitoring & Alerts

### Set Up Monitoring (Before Going Live)

**Key Metrics to Monitor**:
- API response times (p95 should be < 500ms)
- Configuration endpoint latency
- Error rates (should be < 0.1%)
- Database query times
- Web page load times (should be < 3s)

**Recommended Alerts**:
```
- API endpoint returns 5xx error → Alert immediately
- Configuration endpoint latency > 2s → Alert
- Error rate > 1% → Alert
- Database connection pool exhaustion → Alert
- Disk space < 10% → Alert
```

**Tools**:
- CloudWatch (AWS)
- DataDog
- New Relic
- Prometheus + Grafana

### Log Aggregation

Centralize logs for easier debugging:
```
API Logs → CloudWatch / ELK Stack
Web Logs → CloudWatch / Splunk
Database Logs → CloudWatch / RDS Logs
```

---

## Success Criteria

✅ **Deployment is successful when**:
1. All health checks return 200 OK
2. Manual smoke tests all pass
3. Configuration endpoints respond correctly
4. Users can load and edit settings
5. No errors in application logs
6. No alerts triggered
7. Performance metrics are normal

---

## Post-Deployment Steps

### Day 1 (After Deployment)
- [ ] Monitor error logs for anomalies
- [ ] Check performance metrics (response times, error rates)
- [ ] Verify configuration data integrity
- [ ] Test with real users (if available)

### Week 1
- [ ] Gather user feedback
- [ ] Review application logs for warnings
- [ ] Run full end-to-end test suite
- [ ] Confirm no data corruption
- [ ] Validate audit logs are working

### Week 2+
- [ ] Implement audit trail logging (store in database)
- [ ] Fix any identified issues
- [ ] Plan for full production release
- [ ] Prepare user documentation

---

## Contact & Support

**During Deployment**:
- Deployment Engineer: [Contact Info]
- Backend Lead: [Contact Info]
- Frontend Lead: [Contact Info]
- On-Call: [PagerDuty/Slack Channel]

**If Issues Arise**:
1. Check logs: `tail -f deployment.log`
2. Review metrics in monitoring dashboard
3. Check if third-party services are down (GitHub, npm, etc.)
4. Consult rollback plan above
5. Contact on-call engineer

---

**Prepared by**: Claude Code  
**Last Updated**: 2026-06-16  
**Status**: Ready for Staging Deployment
