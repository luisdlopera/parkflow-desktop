# ParkFlow Production Rollback Strategy

**Version**: 1.0  
**Last Updated**: 2026-06-25  
**Author**: DevOps & Database Teams  
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Rollback Decision Matrix](#rollback-decision-matrix)
2. [Application Rollback](#application-rollback)
3. [Database Rollback](#database-rollback)
4. [Data Recovery Procedures](#data-recovery-procedures)
5. [Incident Timeline & Escalation](#incident-timeline--escalation)
6. [Post-Rollback Checklist](#post-rollback-checklist)

---

## Rollback Decision Matrix

### When to Rollback (Automatic Triggers)

| Incident | Threshold | Action | Timeline |
|----------|-----------|--------|----------|
| **API Error Rate** | > 5% for 2+ min | Start rollback | Immediate |
| **API Response Time (p99)** | > 5 seconds for 2+ min | Start rollback | Immediate |
| **Database Connection Failures** | > 10/min sustained | Start rollback | Immediate |
| **Memory/CPU Exhaustion** | > 95% for 5+ min | Escalate + rollback | 2-3 min |
| **Pod Restart Loop** | CrashLoopBackOff state | Start rollback | Immediate |
| **Data Corruption** | Detected via queries | STOP - use recovery | Immediate |
| **Security Breach** | Confirmed attack | STOP deployment | Immediate |
| **Certificate Failure** | SSL/TLS misconfigured | Fix or rollback | 5 min |

### Decision Flowchart

```
Is system critical (>50% users affected)?
├─ YES → Rollback IMMEDIATELY
└─ NO → Continue

Is the issue data-related (corruption/loss)?
├─ YES → STOP, use data recovery procedure
└─ NO → Continue

Can we fix in < 15 minutes?
├─ YES → Attempt fix with enhanced monitoring
└─ NO → Rollback

Auto-rollback enabled in deployment?
├─ YES → System will initiate rollback
└─ NO → Manual trigger required
```

---

## Application Rollback

### Scenario 1: API Deployment Issue (Quick Rollback)

**Timeline**: 2-3 minutes total

#### Step 1: Immediate Pause (30 seconds)

```bash
#!/bin/bash
# File: scripts/emergency-rollback.sh

set -e

echo "🚨 [$(date)] Emergency rollback initiated..."

# 1. Scale down problematic deployment
kubectl scale deployment parkflow-api --replicas=0 --record
# ✅ This stops the bleeding immediately

# 2. Verify no requests reaching new version
sleep 2

# 3. Check error rate
ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total%7Bstatus%3D~%225..%22%7D%5B1m%5D)" \
  | jq '.data.result[0].value[1]' 2>/dev/null || echo "0")

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "⚠️  Error rate still high: $ERROR_RATE, continuing rollback..."
else
  echo "✅ Error rate dropping, proceeding with rollback..."
fi
```

#### Step 2: Identify Previous Good Version (1 minute)

```bash
# 1. Check deployment history
kubectl rollout history deployment/parkflow-api

# Output example:
# deployment.apps/parkflow-api
# REVISION  CHANGE-CAUSE
# 1         kubectl set image deployment/parkflow-api api=parkflow-api:v1.0.0
# 2         kubectl set image deployment/parkflow-api api=parkflow-api:v1.0.1
# 3         kubectl set image deployment/parkflow-api api=parkflow-api:v1.0.2 (CURRENT - BROKEN)

# 2. Get previous version details
PREV_REVISION=$(kubectl rollout history deployment/parkflow-api | tail -2 | head -1 | awk '{print $1}')
# PREV_REVISION = 2

# 3. Check release notes for v1.0.1
echo "Rolling back to revision $PREV_REVISION..."
kubectl rollout history deployment/parkflow-api --revision=$PREV_REVISION
```

#### Step 3: Execute Rollback (1 minute)

```bash
# 1. Rollback to previous revision
kubectl rollout undo deployment/parkflow-api --to-revision=$PREV_REVISION --record

# 2. Monitor rollout status
kubectl rollout status deployment/parkflow-api --timeout=180s
# Expected: "deployment "parkflow-api" successfully rolled out"

# 3. Verify pod health
kubectl get pods -l app=parkflow-api -o wide
# Expected: All pods in Running state, Ready 1/1
```

#### Step 4: Verification (30 seconds)

```bash
# 1. Health check
curl -m 5 https://api.parkflow.com/actuator/health | jq '.status'
# Expected: "UP"

# 2. Error rate check
sleep 5
ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total%7Bstatus%3D~%225..%22%7D%5B1m%5D)" \
  | jq '.data.result[0].value[1]' 2>/dev/null || echo "0")
echo "Error rate: $ERROR_RATE"
# Expected: < 1%

# 3. Sample successful request
curl -X GET https://api.parkflow.com/api/v1/parking/sessions/current \
  -H "Authorization: Bearer $VALID_JWT" \
  -w "\nStatus: %{http_code}\n"
# Expected: HTTP 200 with session data
```

---

### Scenario 2: Web Application Issue (Quick Rollback)

**Timeline**: 2-3 minutes total

#### Quick Rollback Steps

```bash
# 1. Scale down current web deployment
kubectl scale deployment parkflow-web --replicas=0

# 2. Identify previous good version
WEB_PREV=$(kubectl rollout history deployment/parkflow-web | tail -2 | head -1 | awk '{print $1}')

# 3. Rollback
kubectl rollout undo deployment/parkflow-web --to-revision=$WEB_PREV --record

# 4. Monitor
kubectl rollout status deployment/parkflow-web --timeout=180s

# 5. Verify (test from browser or curl)
curl -m 5 https://app.parkflow.com/ | grep -q "ParkFlow" && echo "✅ Web rollback successful"
```

---

## Database Rollback

### Critical: Database Rollback Decision

**⚠️ DATABASE CHANGES ARE PERMANENT — Only rollback if:**
- Data corruption detected
- Unexpected schema changes
- Data loss incident
- Migration failed and partially applied

**Do NOT rollback schema if:**
- New columns/tables added (safe, backward compatible)
- Index added (safe, can remove without rollback)
- Non-destructive data updates

### Scenario 1: Failed Flyway Migration Rollback

**Timeline**: 5-10 minutes total

#### Step 1: Assess Migration Damage (2 minutes)

```bash
# 1. Check what migrations failed
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
SELECT installed_rank, version, description, execution_time, success FROM flyway_schema_history
ORDER BY installed_rank DESC LIMIT 10;
EOF

# Output example:
# installed_rank | version | description | execution_time | success
# 23             | V023    | Add column X | 1500           | FALSE
# 22             | V022    | Update Y     | 2000           | TRUE

# 2. Check for partial data changes
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM table_affected_by_v023;"

# 3. Determine if tables are locked or in transaction
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# If locked, kill blocking connections:
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND usename != 'postgres';" 
```

#### Step 2: Restore from Backup (5-8 minutes)

```bash
# 1. List available backups
aws rds describe-db-snapshots --db-instance-identifier parkflow-prod \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,CreateTime,Status]' \
  --output table

# 2. Find snapshot before failed migration
# Look for snapshot created BEFORE the migration attempt
SNAPSHOT_ID="parkflow-prod-2026-06-25-14-30-00"  # Before migration

# 3. Restore from snapshot to new instance (STEP 1: Create new instance)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier parkflow-prod-restored \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --db-instance-class db.t3.large \
  --publicly-accessible false
# ⏱️ This takes 5-8 minutes

# 4. Monitor restoration progress
PERCENT=0
while [ $PERCENT -lt 100 ]; do
  PERCENT=$(aws rds describe-db-instances \
    --db-instance-identifier parkflow-prod-restored \
    --query 'DBInstances[0].PendingCloudwatchLogsExports' \
    --output text | wc -c)
  echo "Restoration: ${PERCENT}% complete..."
  sleep 30
done

# 5. Verify restored database is accessible
RESTORED_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier parkflow-prod-restored \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

PGPASSWORD=$DB_PASSWORD psql -h $RESTORED_ENDPOINT -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM flyway_schema_history;"
# Expected: Migrations match backup point
```

#### Step 3: Swap Endpoints (1-2 minutes)

```bash
# ⚠️ CAUTION: This causes brief downtime

# 1. Check if any connections to old database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'parkflow_prod';"

# 2. Kill all connections to old database (CAREFUL!)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'parkflow_prod'
  AND pid <> pg_backend_pid();
EOF

# 3. Modify RDS endpoint in Kubernetes secret
# Option A: Update DNS CNAME to point to restored instance
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "parkflow-prod-db.c1234567890.us-east-1.rds.amazonaws.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$RESTORED_ENDPOINT'"}]
      }
    }]
  }'

# Option B: Update Kubernetes secret directly
kubectl get secret parkflow-secrets -o jsonpath='{.data.database-url}' | base64 -d
# Then update with new endpoint

# 4. Rolling restart of API pods to pick up new connection
kubectl rollout restart deployment/parkflow-api

# 5. Verify connection
kubectl logs deployment/parkflow-api --tail=20 | grep -i "database\|connection"
```

#### Step 4: Verification (1-2 minutes)

```bash
# 1. Health check
curl -m 5 https://api.parkflow.com/actuator/health/db | jq '.status'
# Expected: "UP"

# 2. Sample data query
curl -X GET https://api.parkflow.com/api/v1/parking/sessions?limit=1 \
  -H "Authorization: Bearer $VALID_JWT" | jq '.data | length'
# Expected: >= 1

# 3. Verify Flyway migrations match
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true;"

# 4. Check data integrity
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
-- Sample integrity checks
SELECT COUNT(*) as total_companies FROM companies;
SELECT COUNT(*) as total_users FROM app_user;
SELECT COUNT(*) as total_sessions FROM parking_session;
EOF
```

#### Step 5: Cleanup (after verification)

```bash
# 1. Delete temporary restored instance (keep for 24hrs as backup)
aws rds delete-db-instance \
  --db-instance-identifier parkflow-prod-restored \
  --skip-final-snapshot

# 2. Create new snapshot for future reference
aws rds create-db-snapshot \
  --db-instance-identifier parkflow-prod \
  --db-snapshot-identifier parkflow-prod-post-rollback-$(date +%Y%m%d-%H%M%S)

# 3. Clean up old snapshots (keep last 5)
aws rds describe-db-snapshots --query 'DBSnapshots | sort_by(@, &CreateTime) | [0:-5]' \
  --query 'DBSnapshots[*].DBSnapshotIdentifier' | \
  xargs -I {} aws rds delete-db-snapshot --db-snapshot-identifier {}
```

---

### Scenario 2: Selective Data Rollback (Data Corruption)

**Timeline**: 10-30 minutes depending on scope

#### Step 1: Identify Corrupted Data (5 minutes)

```bash
# 1. Find corrupted records
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF

-- Find sessions with impossible charges
SELECT id, entry_time, exit_time, amount_charged
FROM parking_session
WHERE exit_time IS NOT NULL
  AND amount_charged < 0
  OR amount_charged > 10000;

-- Find orphaned records
SELECT id, company_id FROM parking_session
WHERE company_id NOT IN (SELECT id FROM companies);

-- Find records with impossible timestamps
SELECT id, created_at, updated_at
FROM parking_session
WHERE updated_at < created_at;

EOF

# 2. Quantify impact
CORRUPTED_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t \
  -c "SELECT COUNT(*) FROM parking_session WHERE amount_charged < 0;")
echo "Corrupted records: $CORRUPTED_COUNT"
```

#### Step 2: Point-in-Time Recovery (10-20 minutes)

```bash
# 1. Create snapshot from backup point (before corruption)
BACKUP_TIME="2026-06-25 14:00:00"  # Last known good time

aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier parkflow-prod \
  --target-db-instance-identifier parkflow-prod-recovered \
  --restore-time "$BACKUP_TIME"
# ⏱️ This takes 10-15 minutes

# 2. Verify recovery instance has good data
RECOVERED_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier parkflow-prod-recovered \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

PGPASSWORD=$DB_PASSWORD psql -h $RECOVERED_ENDPOINT -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM parking_session WHERE amount_charged < 0;"
# Expected: 0 (no corrupted records)

# 3. Dump good data from recovered instance
pg_dump -h $RECOVERED_ENDPOINT -U $DB_USER -d $DB_NAME \
  --table parking_session > /tmp/parking_session_good.sql

# 4. Connect to production database
# Manually restore specific tables or use selective restore script
```

#### Step 3: Selective Restore Script

```bash
#!/bin/bash
# File: scripts/selective-restore.sh
# Restores specific tables from backup

SOURCE_DB="parkflow-prod-recovered"
TARGET_DB="parkflow-prod"
TABLE="parking_session"

# 1. Dump source table
pg_dump -h $SOURCE_ENDPOINT -U $DB_USER -d $SOURCE_DB \
  --table=$TABLE --no-acl > /tmp/${TABLE}_backup.sql

# 2. Drop corrupted table in target
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $TARGET_DB \
  -c "DROP TABLE ${TABLE};"

# 3. Restore from backup
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $TARGET_DB < /tmp/${TABLE}_backup.sql

# 4. Verify sequence/ID continuity
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $TARGET_DB <<EOF
SELECT setval('${TABLE}_id_seq', MAX(id)) FROM ${TABLE};
EOF

# 5. Verify data quality
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $TARGET_DB \
  -c "SELECT COUNT(*) FROM ${TABLE} WHERE amount_charged < 0;"
# Expected: 0
```

---

## Data Recovery Procedures

### Accidental Data Deletion Recovery

**Timeline**: 20-40 minutes

```bash
#!/bin/bash
# File: scripts/recover-deleted-data.sh

set -e

TABLE="parking_session"
DELETED_AFTER="2026-06-25 12:00:00"

echo "🔄 Recovering deleted records from $TABLE..."

# 1. Create temporary table from backup
BACKUP_SNAPSHOT="parkflow-prod-2026-06-25-12-00-00"

# 2. Create restore point
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier parkflow-prod \
  --target-db-instance-identifier parkflow-prod-recovery-temp \
  --restore-time "$DELETED_AFTER"

# 3. Wait for restore
RESTORE_STATUS="creating"
while [ "$RESTORE_STATUS" != "available" ]; do
  RESTORE_STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier parkflow-prod-recovery-temp \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text)
  echo "Restore status: $RESTORE_STATUS"
  sleep 30
done

# 4. Query deleted data from recovered instance
RECOVERED_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier parkflow-prod-recovery-temp \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# 5. Export deleted records
PGPASSWORD=$DB_PASSWORD psql -h $RECOVERED_ENDPOINT -U $DB_USER -d $DB_NAME \
  -c "COPY (SELECT * FROM $TABLE WHERE updated_at > '$DELETED_AFTER') \
      TO '/tmp/deleted_records_export.csv' WITH CSV;"

# 6. Import back to production
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "COPY $TABLE FROM '/tmp/deleted_records_export.csv' WITH CSV;"

# 7. Verify recovery
RECOVERED_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t \
  -c "SELECT COUNT(*) FROM $TABLE WHERE updated_at > '$DELETED_AFTER';")

echo "✅ Recovered $RECOVERED_COUNT records"

# 8. Cleanup temporary instance
aws rds delete-db-instance \
  --db-instance-identifier parkflow-prod-recovery-temp \
  --skip-final-snapshot

echo "✅ Recovery complete"
```

---

## Incident Timeline & Escalation

### Incident Response Timeline

```
T+0:00   → Issue detected (alert fires)
T+0:30   → On-call engineer acknowledges alert
T+1:00   → Root cause identified
T+2:00   → Decision: Fix in-place OR rollback
T+3:00   → Rollback initiated (if chosen)
T+5:00   → Systems stabilized, validation complete
T+10:00  → War room debrief begins
T+24:00  → RCA (Root Cause Analysis) report ready
```

### Escalation Matrix

| Severity | Response | Action |
|----------|----------|--------|
| **P1** (Prod down) | Immediate | Page on-call + management |
| **P2** (Major degradation) | 5 min | Page on-call, notify leads |
| **P3** (Minor issue) | 30 min | On-call handles, log for review |
| **P4** (Non-critical) | 4 hours | Log for next planning |

### On-Call Escalation

```
T+0:00 → Alert fires
         ↓
T+0:30 → On-call engineer (@on-call-slack-channel)
         ├─ Can fix in < 15 min? → FIX
         └─ No? → Escalate to tech lead
            ↓
T+1:00 → Tech lead + on-call engineer
         ├─ Decision: Rollback or fix?
         └─ Rollback? → Execute emergency rollback
            ↓
T+2:00 → If rollback fails → Escalate to VP Engineering
         ├─ Contact AWS support for DB recovery
         └─ Prepare customer communication
```

### Contact Information

```bash
# Update with actual contact info
cat > /tmp/escalation-contacts.txt
┌─────────────────────────────────────────────┐
│ PARKFLOW ESCALATION CONTACTS                │
├─────────────────────────────────────────────┤
│ On-Call Engineer: Slack @on-call            │
│ Tech Lead: @tech-lead-slack                 │
│ VP Engineering: @vp-engineering             │
│ Database Admin: @dba                        │
│ AWS Support: +1-206-266-4064                │
│ Incident Commander: @ic-on-call             │
└─────────────────────────────────────────────┘
```

---

## Post-Rollback Checklist

### Immediate Actions (First 30 minutes)

- [ ] **System Stabilized**: Verify all pods running, no error spikes
- [ ] **Customer Communication**: Notify affected users (if applicable)
- [ ] **Incident Channel**: Post summary to #incidents Slack channel
- [ ] **Monitoring**: Verify all dashboards show healthy metrics
- [ ] **Backup**: Create backup of current state for forensics

### Root Cause Analysis (Within 24 hours)

```bash
# 1. Collect incident artifacts
mkdir -p /tmp/incident-rca-2026-06-25/
cd /tmp/incident-rca-2026-06-25/

# Logs
kubectl logs deployment/parkflow-api --tail=500 > api-logs.txt
kubectl logs deployment/parkflow-web --tail=500 > web-logs.txt

# Metrics
curl -s "http://prometheus:9090/api/v1/query_range?query=rate(http_requests_total[5m])&start=$(date -d '2 hours ago' +%s)&end=$(date +%s)&step=60" > metrics.json

# Events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' > events.txt

# Pod status
kubectl get pods --all-namespaces --show-all > pod-status.txt

# 2. Document timeline
echo "
INCIDENT TIMELINE
==================
T+0:00 - Alert fired (error rate > 5%)
T+0:30 - Engineer acknowledged
T+1:15 - Root cause identified: OOM in API pods
T+2:00 - Decision: Rollback to v1.0.1
T+3:45 - Rollback complete, system stable
T+4:30 - All checks passing

ROOT CAUSE
==========
New caching layer in v1.0.2 had memory leak,
causing OOM on pod startup. Not caught in staging
due to lower traffic volume.

RESOLUTION
==========
Reverted to v1.0.1, scheduled hotfix for caching
implementation. Added memory profiling to CI.
" > INCIDENT_SUMMARY.txt

# 3. Schedule RCA meeting
echo "RCA Meeting scheduled for 2026-06-26 10:00 AM"
```

### Prevention for Next Time

- [ ] **Code Review**: Review failed change for what was missed
- [ ] **Testing**: Add tests that would have caught issue
- [ ] **Monitoring**: Add alerts for patterns detected
- [ ] **Documentation**: Update deployment runbook if applicable
- [ ] **Training**: Brief team on lessons learned

### Sign-Off

```
Incident: Deployment Rollback on 2026-06-25
Status: ✅ RESOLVED
Timeline: Detected at T+0:00, stable by T+4:30
Impact: 45 minutes of elevated error rate (~100 users affected)
Root Cause: Memory leak in new caching layer

Approvals:
[x] VP Engineering - approved rollback decision
[x] Database Admin - verified data integrity
[x] Tech Lead - confirmed system stable
[x] Incident Commander - incident closed

Next Steps:
- Hotfix for caching issue in progress
- Enhanced memory profiling in CI
- Post-mortem scheduled for 2026-06-26

Date: 2026-06-25
Signed: On-Call Engineer
```

---

## Testing Rollback Procedures

### Monthly Rollback Drill

```bash
#!/bin/bash
# File: scripts/rollback-drill.sh
# Run monthly to ensure rollback procedures work

set -e

echo "🧪 Running monthly rollback drill..."
echo "This will simulate a rollback WITHOUT affecting production"

# 1. Create test namespace
kubectl create namespace parkflow-rollback-test

# 2. Deploy old version to test namespace
kubectl set image deployment/parkflow-api \
  -n parkflow-rollback-test \
  api=parkflow-api:v1.0.1

# 3. Execute rollback
kubectl rollout undo deployment/parkflow-api \
  -n parkflow-rollback-test \
  --to-revision=1

# 4. Verify rollback works
kubectl rollout status deployment/parkflow-api \
  -n parkflow-rollback-test --timeout=180s

# 5. Test endpoints
POD=$(kubectl get pod -n parkflow-rollback-test -l app=parkflow-api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n parkflow-rollback-test $POD -- curl -s http://localhost:6011/actuator/health | jq '.status'

# 6. Cleanup
kubectl delete namespace parkflow-rollback-test

echo "✅ Rollback drill passed!"
echo "Verified: Basic rollback procedure functions correctly"
```

---

**Status**: ✅ PRODUCTION READY  
**Last Drilled**: 2026-06-15  
**Next Drill**: 2026-07-15  
**On-Call Contact**: See escalation matrix above
