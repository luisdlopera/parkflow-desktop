# ParkFlow Production Deployment Runbook

**Version**: 1.0  
**Last Updated**: 2026-06-25  
**Author**: DevOps Team  
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Verification](#pre-deployment-verification)
3. [Infrastructure Deployment](#infrastructure-deployment)
4. [Application Deployment](#application-deployment)
5. [Verification & Health Checks](#verification--health-checks)
6. [Post-Deployment Steps](#post-deployment-steps)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- [ ] **Terraform** `>= 1.5.0` - IaC provisioning
- [ ] **AWS CLI** `>= 2.0.0` - Cloud resource management
- [ ] **Docker** `>= 24.0.0` - Container runtime
- [ ] **kubectl** `>= 1.28.0` - Kubernetes management (if EKS)
- [ ] **jq** `>= 1.6` - JSON parsing utilities
- [ ] **curl** `>= 7.0.0` - HTTP client for health checks
- [ ] **git** `>= 2.40.0` - Version control

### AWS Credentials & Permissions

```bash
# Verify AWS credentials configured
aws sts get-caller-identity

# Required IAM policies:
# - AmazonEC2FullAccess (or restricted to specific instances)
# - AmazonRDSFullAccess (database management)
# - AmazonECRFullAccess (container registry)
# - AmazonEKSFullAccess (if using Kubernetes)
# - CloudFormationFullAccess (infrastructure provisioning)
# - CloudWatchFullAccess (monitoring)
# - CloudFrontFullAccess (CDN for web app)
```

### Environment Configuration Files

Create `.env.production` in project root:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
ENVIRONMENT=production

# Database Configuration
DB_HOST=parkflow-prod-db.c1234567890.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=parkflow_prod
DB_USER=parkflow_admin
DB_PASSWORD=<SECURE_PASSWORD>  # Use AWS Secrets Manager in practice

# API Configuration
API_PORT=6011
API_REPLICAS=3
API_CPU_REQUEST=500m
API_MEMORY_REQUEST=1Gi
API_CPU_LIMIT=2000m
API_MEMORY_LIMIT=4Gi

# Web Configuration
WEB_PORT=6001
WEB_REPLICAS=2
WEB_CDN_DOMAIN=app.parkflow.com

# Monitoring
PROMETHEUS_RETENTION=30d
DATADOG_ENABLED=true
DATADOG_API_KEY=<KEY>

# Security
JWT_SECRET=<SECURE_JWT_SECRET>
TLS_CERT_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxxxx
```

### Terraform State Management

```bash
# Initialize Terraform remote state (if not already done)
cd infra/terraform
terraform init \
  -backend-config="bucket=parkflow-terraform-state" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=terraform-locks"
```

---

## Pre-Deployment Verification

### Step 1: Code Validation

```bash
# 1. Verify main branch is clean
git status
# Expected: On branch main, nothing to commit

# 2. Pull latest code
git pull origin main

# 3. Verify version tag
git describe --tags
# Expected: v1.x.x (or latest tag)

# 4. Run full test suite
cd apps/api
gradle clean build -x test  # Build without tests first
gradle test  # Then run tests
# Expected: All tests pass, 0 failures

cd ../web
pnpm install
pnpm build
pnpm test
# Expected: Build succeeds, no type errors
```

### Step 2: Database Migration Validation

```bash
# 1. Test migrations in staging first
cd apps/api
gradle flywayValidate -Dflyway.url=jdbc:postgresql://staging-db:5432/parkflow_test \
                      -Dflyway.user=test \
                      -Dflyway.password=test

# Expected: Validates all migration files

# 2. Check for uncommitted migrations
git status | grep "migration/"
# Expected: No uncommitted migration files

# 3. Verify migration sequence
gradle flywayInfo -Dflyway.url=jdbc:postgresql://<DB>:5432/parkflow_prod
# Expected: All migrations accounted for, no gaps
```

### Step 3: Docker Image Build & Scan

```bash
# 1. Build API image
cd apps/api
docker build -t parkflow-api:prod-$(git rev-short) \
             --build-arg JAVA_VERSION=21 \
             -f Dockerfile .

# 2. Build web image
cd ../web
docker build -t parkflow-web:prod-$(git rev-short) \
             --build-arg NODE_VERSION=20 \
             -f Dockerfile .

# 3. Security scan (requires Trivy)
trivy image --severity CRITICAL,HIGH parkflow-api:prod-$(git rev-short)
trivy image --severity CRITICAL,HIGH parkflow-web:prod-$(git rev-short)
# Expected: ✅ No vulnerabilities, or all have remediation plans
```

### Step 4: Infrastructure Readiness Check

```bash
# 1. Validate Terraform configuration
cd infra/terraform
terraform validate
# Expected: ✅ Success

# 2. Plan infrastructure changes (dry run)
terraform plan -out=tfplan-$(date +%s)
# Expected: Review changes, no surprises (should be minimal for upgrades)

# 3. Check AWS resources exist (if already deployed)
aws ec2 describe-instances --filters "Name=tag:Environment,Values=production" \
                            --query 'Reservations[].Instances[].InstanceId'
# Expected: Lists instance IDs (or empty if first deploy)
```

---

## Infrastructure Deployment

### Step 1: Network Infrastructure

```bash
# 1. Create/update VPC, subnets, security groups
cd infra/terraform
terraform apply -target=aws_vpc.main -var-file=prod.tfvars

# 2. Verify security group rules
aws ec2 describe-security-groups --filters "Name=tag:Environment,Values=production" \
                                  --query 'SecurityGroups[0].IpPermissions'
# Expected: Port 443 (HTTPS) open to 0.0.0.0, port 5432 (DB) open to API security group

# 3. Create load balancer
terraform apply -target=aws_lb.main -var-file=prod.tfvars
terraform apply -target=aws_lb_target_group.api -var-file=prod.tfvars

# Wait 2-3 minutes for LB to stabilize
sleep 180
```

### Step 2: Database Infrastructure

```bash
# 1. Create RDS PostgreSQL instance
cd infra/terraform
terraform apply -target=aws_db_instance.main -var-file=prod.tfvars
# ⏱️ This takes 10-15 minutes

# 2. Wait for instance to be available
ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier parkflow-prod \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# 3. Test database connection
PGPASSWORD=$DB_PASSWORD psql -h $ENDPOINT -U $DB_USER -d $DB_NAME -c "SELECT version();"
# Expected: PostgreSQL version output

# 4. Enable automated backups
terraform apply -target=aws_db_instance.backup_retention -var-file=prod.tfvars
```

### Step 3: Container Registry & Push Images

```bash
# 1. Create ECR repositories
aws ecr create-repository --repository-name parkflow-api --region us-east-1
aws ecr create-repository --repository-name parkflow-web --region us-east-1

# 2. Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# 3. Tag and push API image
API_IMAGE_TAG=$(git describe --tags --short)
docker tag parkflow-api:prod-$(git rev-parse --short HEAD) \
           123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-api:${API_IMAGE_TAG}
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-api:${API_IMAGE_TAG}

# 4. Tag and push Web image
docker tag parkflow-web:prod-$(git rev-parse --short HEAD) \
           123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-web:${API_IMAGE_TAG}
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-web:${API_IMAGE_TAG}

# 5. Verify images exist in ECR
aws ecr list-images --repository-name parkflow-api --region us-east-1
aws ecr list-images --repository-name parkflow-web --region us-east-1
# Expected: Latest image tag appears in results
```

### Step 4: Kubernetes Cluster (if EKS)

```bash
# 1. Create EKS cluster
cd infra/terraform
terraform apply -target=aws_eks_cluster.main -var-file=prod.tfvars
# ⏱️ This takes 15-20 minutes

# 2. Create node groups
terraform apply -target=aws_eks_node_group.main -var-file=prod.tfvars

# 3. Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name parkflow-prod

# 4. Verify cluster connectivity
kubectl cluster-info
# Expected: Kubernetes master URL and CoreDNS service

# 5. Deploy ingress controller (nginx)
kubectl apply -f infra/k8s/ingress-controller.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

---

## Application Deployment

### Step 1: Database Migrations

```bash
# 1. Connect to production database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# 2. Check current schema version
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;

# 3. Run Flyway migrations
cd apps/api
gradle flywayMigrate \
  -Dflyway.url=jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME \
  -Dflyway.user=$DB_USER \
  -Dflyway.password=$DB_PASSWORD

# Expected output:
# Successfully applied 0 migrations
# (or list of applied migrations if upgrading versions)

# 4. Verify migration completion
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT version FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1;"
```

### Step 2: Deploy API Service

```bash
# 1. Create Kubernetes deployment manifest
cat > infra/k8s/parkflow-api-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parkflow-api
  labels:
    app: parkflow-api
spec:
  replicas: ${API_REPLICAS}
  selector:
    matchLabels:
      app: parkflow-api
  template:
    metadata:
      labels:
        app: parkflow-api
    spec:
      containers:
      - name: api
        image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-api:${API_IMAGE_TAG}
        ports:
        - containerPort: 6011
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: parkflow-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: parkflow-secrets
              key: jwt-secret
        resources:
          requests:
            cpu: ${API_CPU_REQUEST}
            memory: ${API_MEMORY_REQUEST}
          limits:
            cpu: ${API_CPU_LIMIT}
            memory: ${API_MEMORY_LIMIT}
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 6011
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 6011
          initialDelaySeconds: 20
          periodSeconds: 5
EOF

# 2. Create secrets (if not already created)
kubectl create secret generic parkflow-secrets \
  --from-literal=database-url=jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME \
  --from-literal=jwt-secret=$JWT_SECRET \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Deploy API
kubectl apply -f infra/k8s/parkflow-api-deployment.yaml

# 4. Wait for deployment to be ready
kubectl wait deployment/parkflow-api --for=condition=available --timeout=300s

# 5. Check pod status
kubectl get pods -l app=parkflow-api
# Expected: All pods in Running state
```

### Step 3: Deploy Web Service

```bash
# 1. Create web deployment manifest
cat > infra/k8s/parkflow-web-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parkflow-web
  labels:
    app: parkflow-web
spec:
  replicas: ${WEB_REPLICAS}
  selector:
    matchLabels:
      app: parkflow-web
  template:
    metadata:
      labels:
        app: parkflow-web
    spec:
      containers:
      - name: web
        image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-web:${API_IMAGE_TAG}
        ports:
        - containerPort: 6001
        env:
        - name: NEXT_PUBLIC_API_URL
          value: https://api.parkflow.com
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /
            port: 6001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 6001
          initialDelaySeconds: 20
          periodSeconds: 5
EOF

# 2. Deploy web
kubectl apply -f infra/k8s/parkflow-web-deployment.yaml

# 3. Wait for deployment
kubectl wait deployment/parkflow-web --for=condition=available --timeout=300s

# 4. Check pod status
kubectl get pods -l app=parkflow-web
# Expected: All pods in Running state
```

### Step 4: Configure Load Balancer & DNS

```bash
# 1. Create services
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: parkflow-api-svc
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 6011
  selector:
    app: parkflow-api
---
apiVersion: v1
kind: Service
metadata:
  name: parkflow-web-svc
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 6001
  selector:
    app: parkflow-web
EOF

# 2. Get load balancer endpoints
API_LB=$(kubectl get svc parkflow-api-svc -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
WEB_LB=$(kubectl get svc parkflow-web-svc -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "API Load Balancer: $API_LB"
echo "Web Load Balancer: $WEB_LB"

# 3. Update Route 53 DNS records
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.parkflow.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "'$API_LB'"}]
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "app.parkflow.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "'$WEB_LB'"}]
        }
      }
    ]
  }'

# 4. Verify DNS propagation
nslookup api.parkflow.com
nslookup app.parkflow.com
# Expected: Returns load balancer IP addresses
```

---

## Verification & Health Checks

### Step 1: API Health Checks

```bash
#!/bin/bash
# File: scripts/health-check.sh

API_ENDPOINT="https://api.parkflow.com"
WEB_ENDPOINT="https://app.parkflow.com"
TIMEOUT=5

echo "🏥 Running ParkFlow Health Checks..."
echo "=================================="

# Check 1: API is responding
echo "✓ Checking API health..."
HEALTH=$(curl -s -m $TIMEOUT "$API_ENDPOINT/actuator/health")
if echo "$HEALTH" | jq -e '.status == "UP"' > /dev/null 2>&1; then
  echo "  ✅ API is UP"
else
  echo "  ❌ API is DOWN"
  echo "  Response: $HEALTH"
  exit 1
fi

# Check 2: Database connectivity
echo "✓ Checking database connectivity..."
DB_HEALTH=$(curl -s -m $TIMEOUT "$API_ENDPOINT/actuator/health/db")
if echo "$DB_HEALTH" | jq -e '.status == "UP"' > /dev/null 2>&1; then
  echo "  ✅ Database is UP"
else
  echo "  ❌ Database is DOWN"
  echo "  Response: $DB_HEALTH"
  exit 1
fi

# Check 3: Authentication endpoint
echo "✓ Checking authentication endpoint..."
AUTH_RESPONSE=$(curl -s -m $TIMEOUT -X POST "$API_ENDPOINT/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@parkflow.com","password":"wrongpassword"}')

if echo "$AUTH_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "  ✅ Auth endpoint responding"
else
  echo "  ❌ Auth endpoint not responding properly"
  exit 1
fi

# Check 4: Web app is loading
echo "✓ Checking web app..."
WEB_STATUS=$(curl -s -m $TIMEOUT -w "%{http_code}" -o /dev/null "$WEB_ENDPOINT/")
if [ "$WEB_STATUS" -eq 200 ]; then
  echo "  ✅ Web app is UP (HTTP $WEB_STATUS)"
else
  echo "  ⚠️  Web app returned HTTP $WEB_STATUS"
fi

# Check 5: API Swagger documentation
echo "✓ Checking Swagger UI..."
SWAGGER=$(curl -s -m $TIMEOUT -w "%{http_code}" -o /dev/null "$API_ENDPOINT/swagger-ui.html")
if [ "$SWAGGER" -eq 200 ]; then
  echo "  ✅ Swagger UI is available"
else
  echo "  ⚠️  Swagger UI returned HTTP $SWAGGER"
fi

# Check 6: Pod status in Kubernetes
echo "✓ Checking pod status..."
API_PODS=$(kubectl get pods -l app=parkflow-api -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -c "True")
WEB_PODS=$(kubectl get pods -l app=parkflow-web -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -c "True")

echo "  API Pods Ready: $API_PODS"
echo "  Web Pods Ready: $WEB_PODS"

# Check 7: Monitor error rates
echo "✓ Checking error rates..."
ERROR_RATE=$(curl -s -m $TIMEOUT "http://prometheus:9090/api/v1/query?query=rate(http_requests_total%7Bstatus%3D~%225..%22%7D%5B5m%5D)" | jq '.data.result[0].value[1]')
if (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
  echo "  ✅ Error rate is low: $ERROR_RATE"
else
  echo "  ⚠️  Error rate is elevated: $ERROR_RATE (investigate logs)"
fi

echo ""
echo "=================================="
echo "✅ All critical health checks passed!"
echo "Deployment is READY for production traffic"
```

### Step 2: Load Balancer & SSL Verification

```bash
# 1. Test HTTPS connectivity
curl -v -I https://api.parkflow.com/actuator/health 2>&1 | grep -E "SSL|HTTP|certificate"
# Expected: "HTTP/2 200" and SSL certificate info

# 2. Check SSL certificate expiration
echo | openssl s_client -servername api.parkflow.com -connect api.parkflow.com:443 2>/dev/null | \
  openssl x509 -noout -dates
# Expected: "notAfter=..." at least 30+ days in future

# 3. Verify load balancer health check targets
kubectl get endpoints parkflow-api-svc
# Expected: Multiple pod IPs listed with port 6011

# 4. Test DNS resolution
dig api.parkflow.com
# Expected: ANSWER section shows load balancer CNAME
```

### Step 3: Database Verification

```bash
# 1. Test connection
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT NOW();"
# Expected: Current timestamp

# 2. Verify migrations applied
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true;"
# Expected: Number of successful migrations (>= 20)

# 3. Check table counts
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT schemaname, COUNT(*) FROM pg_tables GROUP BY schemaname;"
# Expected: public schema has 30+ tables

# 4. Verify backup configuration
aws rds describe-db-instances --db-instance-identifier parkflow-prod \
  --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow]'
# Expected: BackupRetentionPeriod >= 30 days
```

---

## Post-Deployment Steps

### Step 1: Performance Baseline Establishment

```bash
# 1. Take snapshot of current metrics
kubectl exec -it <prometheus-pod> -- \
  curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])"

# 2. Document baseline response times
BASELINE=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, http_request_duration_seconds)")
echo "p95 Response Time Baseline: $BASELINE seconds" > docs/deployment/PERFORMANCE_BASELINE.md

# 3. Set up alerting rules
kubectl apply -f infra/k8s/prometheus-rules.yaml
```

### Step 2: Enable Monitoring & Logging

```bash
# 1. Deploy Prometheus scrape config
kubectl apply -f infra/k8s/prometheus-config.yaml

# 2. Deploy CloudWatch agent
kubectl apply -f infra/k8s/cloudwatch-agent.yaml

# 3. Configure log retention
aws logs put-retention-policy \
  --log-group-name /aws/eks/parkflow-prod \
  --retention-in-days 30

# 4. Test metrics collection
kubectl get servicemonitor
# Expected: List of servicemonitors configured
```

### Step 3: Backup Verification

```bash
# 1. Trigger manual backup
aws rds create-db-snapshot \
  --db-instance-identifier parkflow-prod \
  --db-snapshot-identifier parkflow-prod-$(date +%Y%m%d-%H%M%S)

# 2. Monitor backup progress
aws rds describe-db-snapshots --db-snapshot-identifier parkflow-prod-* \
  --query 'DBSnapshots[-1].[DBSnapshotIdentifier,Status,PercentProgress]'

# 3. Verify automated backups enabled
aws rds describe-db-instances --db-instance-identifier parkflow-prod \
  --query 'DBInstances[0].AutomaticBackupRetentionPeriod'
# Expected: >= 30 (days)
```

### Step 4: Security Verification

```bash
# 1. Verify SSL/TLS enforcement
curl -H 'User-Agent: test' -L http://api.parkflow.com 2>&1 | grep -E "301|302|Location"
# Expected: Redirects to https://

# 2. Check security headers
curl -I https://api.parkflow.com | grep -E "Strict-Transport|X-Frame|X-Content|Content-Security"
# Expected: Security headers present

# 3. Verify rate limiting is active
for i in {1..50}; do
  curl -s -I https://api.parkflow.com/actuator/health
done 2>&1 | tail -1
# Expected: After 50 requests, may see 429 (Too Many Requests)

# 4. Test authentication
curl -X POST https://api.parkflow.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@parkflow.com","password":"TestPassword123!"}'
# Expected: JWT token in response or 401 error
```

### Step 5: Documentation Update

```bash
# 1. Record deployment timestamp and version
cat > docs/deployment/DEPLOYMENT_LOG.txt <<EOF
Deployment Date: $(date)
Version: $(git describe --tags)
API Container: parkflow-api:$(git describe --tags)
Web Container: parkflow-web:$(git describe --tags)
Database Version: $(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();" | head -1)
Kubernetes Version: $(kubectl version --short)
EOF

# 2. Update deployment status page
cat > infra/k8s/deployment-status.yaml <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: deployment-status
data:
  status: "ACTIVE"
  deployed-at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  version: "$(git describe --tags)"
  region: "us-east-1"
EOF

kubectl apply -f infra/k8s/deployment-status.yaml

# 3. Notify stakeholders
echo "✅ Deployment Complete" | mail -s "ParkFlow Production Deployment - $(date +%Y-%m-%d)" devops@parkflow.com
```

---

## Rollback Procedures

### Automatic Rollback Trigger

If any of these conditions occur, execute immediate rollback:

- [ ] **API error rate > 5%** for more than 2 minutes
- [ ] **Database connection failures** > 10 per minute
- [ ] **API response time p99 > 5 seconds** for more than 2 minutes
- [ ] **Pod restart loops** (CrashLoopBackOff state)
- [ ] **Database migration failures** or data corruption detected
- [ ] **Security incident** detected

### Quick Rollback Script

```bash
#!/bin/bash
# File: scripts/rollback.sh
# Usage: bash scripts/rollback.sh <previous-version-tag>

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: bash scripts/rollback.sh <version-tag>"
  exit 1
fi

echo "🔄 Rolling back to version $VERSION..."

# 1. Scale down current deployment
kubectl set image deployment/parkflow-api \
  api=123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-api:$VERSION \
  --record

kubectl set image deployment/parkflow-web \
  web=123456789012.dkr.ecr.us-east-1.amazonaws.com/parkflow-web:$VERSION \
  --record

# 2. Wait for rollout
kubectl rollout status deployment/parkflow-api --timeout=300s
kubectl rollout status deployment/parkflow-web --timeout=300s

# 3. Verify health
bash scripts/health-check.sh

# 4. If rollback fails, alert on-call
if [ $? -ne 0 ]; then
  echo "❌ Rollback verification failed! Escalating to on-call engineer..."
  # Send alert
fi

echo "✅ Rollback to $VERSION complete"
```

For detailed rollback procedures, see [ROLLBACK.md](ROLLBACK.md)

---

## Troubleshooting

### Common Issues & Solutions

#### 1. **API Pods in CrashLoopBackOff**

```bash
# Check pod logs
kubectl logs deployment/parkflow-api --tail=100 --previous

# Common causes:
# - Database connection string invalid → check ConfigMap/Secret
# - Out of memory → increase memory limits
# - JWT secret mismatch → verify secret value

# Solution: Check logs, fix issue, redeploy
kubectl rollout restart deployment/parkflow-api
```

#### 2. **Database Migration Failures**

```bash
# Check migration status
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT * FROM flyway_schema_history WHERE success = false;"

# Rollback failed migration
flyway undo -Dflyway.url=jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME

# See [ROLLBACK.md](ROLLBACK.md) for detailed recovery
```

#### 3. **Load Balancer Health Check Failing**

```bash
# Verify target group health
aws elbv2 describe-target-health --target-group-arn $TG_ARN

# Check pod readiness
kubectl get pods -l app=parkflow-api -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")]}'

# Verify health check endpoint
curl -v http://localhost:6011/actuator/health

# Increase health check timeout if needed (currently 5 seconds)
```

#### 4. **High Memory Usage in Pods**

```bash
# Check memory usage
kubectl top pods -l app=parkflow-api

# Check JVM memory settings
kubectl exec <pod-name> -- jps -lv

# Adjust if needed: Edit deployment and increase memory limits
# Then force pod recreation
kubectl rollout restart deployment/parkflow-api
```

#### 5. **DNS Not Resolving**

```bash
# Test from pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup api.parkflow.com

# Test from local machine
nslookup api.parkflow.com
dig api.parkflow.com

# Check Route 53 records
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC | jq '.ResourceRecordSets[] | select(.Name | contains("parkflow"))'
```

### Getting Help

1. **Check logs**: `kubectl logs <resource-name> --tail=100`
2. **Check events**: `kubectl describe pod <pod-name>`
3. **Check metrics**: Visit Prometheus at `http://prometheus:9090`
4. **Check resource status**: `kubectl get all`
5. **Contact on-call**: If unresolved in 15 minutes, contact on-call engineer

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (API & web)
- [ ] Docker images built and scanned
- [ ] Migrations validated
- [ ] Terraform plan reviewed
- [ ] Database backups confirmed
- [ ] Stakeholders notified
- [ ] On-call engineer briefed

### Deployment
- [ ] Infrastructure deployed
- [ ] Migrations applied
- [ ] API deployed and scaled
- [ ] Web deployed and scaled
- [ ] DNS records updated
- [ ] SSL certificates verified
- [ ] Load balancers configured

### Post-Deployment
- [ ] Health checks passing
- [ ] All endpoints responding
- [ ] Database connectivity verified
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Backups running
- [ ] Deployment logged

### Sign-Off
- [ ] QA sign-off
- [ ] Product sign-off
- [ ] DevOps sign-off
- [ ] Incident commander on standby

---

**Status**: ✅ PRODUCTION READY  
**Last Verified**: 2026-06-25  
**Next Review**: 2026-07-25
