# Quick Reference Guide — ParkFlow Documentation Index

**Printable Cheat Sheet** — Keep this at your desk during development and deployment.

---

## Architecture Decisions Quick Links

| Decision | File | Key Points | When To Read |
|----------|------|-----------|--------------|
| **Hexagonal** | [ADR-0001](adr/0001-hexagonal-architecture.md) | application/domain/infrastructure layers; ports; 5 public methods per service | Before creating new module |
| **Service Size** | [ADR-0002](adr/0002-god-service-elimination.md) | ≤5 public methods per service; split by business capability | When refactoring monolithic services |
| **Authentication** | [ADR-0003](adr/0003-authentication-strategy.md) | JWT + OAuth2; AUTHORITY_* permissions; Spring Security config | Adding new endpoint requiring auth |
| **Multi-Tenant** | [ADR-0004](adr/0004-multi-tenant-rls.md) | PostgreSQL RLS; TenantContext; company_id filtering | Querying customer data |
| **Deprecation** | [ADR-0005](adr/0005-deprecation-path.md) | Phased endpoint removal; 3-sprint timeline | Modifying public API |
| **API Consolidation** | [ADR-0006](adr/0006-api-consolidation.md) | Single /common/dto/ for all DTOs; no duplication | Creating new request/response objects |
| **Testing** | [ADR-0007](adr/0007-test-infrastructure.md) | H2 for unit tests; Testcontainers for RLS/JSON | Writing integration tests |

---

## Production Procedures Quick Links

| Procedure | File | Duration | Key Command |
|-----------|------|----------|-------------|
| **Pre-Deployment** | [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#pre-deployment-72-hours-before) | 4 hours | `gradle build && gradle test` |
| **Pre-Production** | [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#pre-production-24-hours-before) | 2 hours | `flyway:info -Dflyway.sqlMigrationPrefix=V` |
| **Deployment** | [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#deployment-execution-day) | 1 hour | `flyway:migrate` + health check |
| **Rollback** | [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#rollback-if-needed) | 30 min | `pg_restore -d parkflow -f backup.sql` |
| **Post-Deployment** | [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#post-deployment-24-hours) | 4+ hours | Monitor error rate, check logs |

---

## Development Checklists

### ✅ Before Committing Code

```
[ ] No "any" type used (ESLint @typescript-eslint/no-explicit-any = error)
[ ] Service has ≤5 public methods (split if larger)
[ ] All controllers use /api/v1/configuration/* (not /settings/*)
[ ] Input port (@PortIn) and output port (@RepositoryPort) defined
[ ] Tests written (unit + integration)
[ ] Tests pass: gradle test or pnpm test:web
[ ] No console errors in browser/IDE
[ ] Code review checklist in CONTRIBUTING.md
```

### ✅ Backend: New Service Template

```
modules/<name>/
├── application/
│   ├── usecase/
│   │   ├── <Feature>Service.java (≤5 public methods)
│   │   ├── <Feature>QueryService.java (queries OK if >5)
│   │   └── ... (other services, max 5 per module)
│   ├── port/
│   │   ├── in/
│   │   │   └── <Feature>PortIn.java (input port interface)
│   │   └── out/
│   │       └── <Feature>RepositoryPort.java (persistence port)
│   └── dto/ (or use /common/dto/)
├── domain/
│   └── <Entity>.java
├── infrastructure/
│   ├── controller/
│   │   └── <Feature>Controller.java
│   └── persistence/
│       ├── <Entity>JpaRepository.java
│       ├── <Entity>RepositoryAdapter.java (implements RepositoryPort)
│       └── mapper/
│           └── <Entity>Mapper.java
└── test/ (mirror application structure)
```

### ✅ Frontend: New Route Template

Every route must have:
```
app/(dashboard)/new-feature/
├── page.tsx              (Client component)
├── loading.tsx           (Skeleton loader) ← REQUIRED
├── error.tsx             (Error boundary) ← REQUIRED
└── layout.tsx            (Optional)
```

---

## Code Patterns

### ✅ Service with Ports (Backend)

```java
// Input Port (interface)
public interface CreatePaymentMethodUseCase {
  PaymentMethodResponse create(CreatePaymentMethodRequest req);
}

// Service Implementation
@Service
@RequiredArgsConstructor
public class CreatePaymentMethodService implements CreatePaymentMethodUseCase {
  private final PaymentMethodRepositoryPort repository;
  private final AuthorizationPortOut authorization;
  
  @Override
  public PaymentMethodResponse create(CreatePaymentMethodRequest req) {
    // Authorization check
    if (!authorization.isAuthorized(userId, "AUTHORITY_PAYMENT_CREATE", companyId)) {
      throw new AuthorizationException("Access denied");
    }
    
    // Business logic
    PaymentMethod method = new PaymentMethod(req.getName(), req.getType());
    PaymentMethod saved = repository.save(method);
    
    // Return response
    return PaymentMethodMapper.toResponse(saved);
  }
}
```

### ✅ Strict TypeScript (Frontend)

```typescript
// Define types
interface PaymentMethod {
  id: string;
  name: string;
  type: 'CASH' | 'CARD' | 'CHECK' | 'BANK_TRANSFER';
  isActive: boolean;
}

// Use generics in hooks
const { rows: methods, handleSave } = useConfigCrud<PaymentMethod>(
  '/api/v1/configuration/payment-methods'
);

// Type-safe callbacks
const onEdit = (method: PaymentMethod) => {
  handleSave({ ...method, name: 'Updated' });
};
```

### ✅ Authorization Check (Backend)

```java
@RestController
@RequestMapping("/api/v1/cash-sessions")
@RequiredArgsConstructor
public class CashSessionController {
  private final OpenCashSessionUseCase openUseCase;
  
  @PostMapping
  @PreAuthorize("hasAuthority('AUTHORITY_CASH_SESSION_CREATE')")
  public CashSessionResponse open(@Valid @RequestBody OpenCashRequest req) {
    return openUseCase.open(req);
  }
}
```

---

## Important Files & Directories

```
parkflow-desktop/
├── docs/
│   ├── adr/                              (7 architecture decisions)
│   ├── PRODUCTION_CHECKLIST.md           (Deploy procedures)
│   ├── TYPE_SAFETY.md                    (TypeScript migration: 327 items)
│   ├── QUICK_REFERENCE.md                (This file)
│   ├── api-contract-tests.md             (39 tests)
│   └── runbooks/
│       ├── deployment-runbook.md
│       └── rollback-strategy.md
│
├── apps/api/src/main/java/com/parkflow/modules/
│   ├── common/                           (Shared DTOs, ports, exceptions)
│   ├── configuration/                    (Rates, users, vehicles)
│   ├── parking/                          (Operations, lockers, spaces)
│   ├── cash/                             (Cash sessions, movements)
│   ├── licensing/                        (License validation)
│   └── ... (9 more modules)
│
├── apps/web/src/
│   ├── types/                            (Domain types - use strict!)
│   ├── lib/api/                          (API service functions)
│   ├── hooks/                            (Custom React hooks)
│   ├── components/config/                (Configuration pages)
│   └── app/(dashboard)/                  (Route segments)
│
├── CLAUDE.md                             (Development standards)
├── README.md                             (Entry point; updated with links)
└── CONTRIBUTING.md                       (PR process)
```

---

## Common Commands

### Backend
```bash
# Build
cd apps/api && gradle build

# Test
gradle test                              # All tests
gradle test --tests "*ControllerTest"    # Specific test class
gradle test --tests "*CashSession*"      # Pattern matching

# Verify architecture
gradle checkArch                          # Hexagonal compliance (if configured)

# Database
flyway:info                               # Show migrations
flyway:migrate                            # Apply forward
flyway:validate                           # Check consistency
```

### Frontend
```bash
# Build
cd apps/web && pnpm build

# Test
pnpm test:web                            # All tests
pnpm test:web -- --grep "PaymentMethod" # Specific tests

# Type check
pnpm type:check                          # TypeScript compilation

# Lint
pnpm lint:web                            # ESLint (including no-explicit-any)

# Dev
pnpm dev:web                             # Start dev server
```

### Monorepo
```bash
# Full validation (pre-commit)
pnpm validate                            # Build + test all apps

# Security
pnpm security:deps                       # Check for vulnerabilities
pnpm security:deps:fix                   # Auto-fix vulnerabilities

# Ports
pnpm ports:check                         # Verify availability
```

---

## Emergency Contacts

| Role | Status | Location |
|------|--------|----------|
| On-Call Engineer | TBD | Slack: @on-call |
| DevOps Lead | TBD | Slack: @devops |
| Security Lead | TBD | Slack: @security |
| Database Admin | TBD | Slack: @dba |

**Emergency Procedure**: 
1. Declare incident in #incidents channel
2. Get on-call engineer (page if needed)
3. Follow PRODUCTION_CHECKLIST.md rollback section

---

## Key Metrics to Monitor

| Metric | Target | Alert Threshold | Check Command |
|--------|--------|-----------------|---|
| API Error Rate | < 0.5% | > 5% | Check error logs, APM dashboard |
| Response Time (p95) | < 500ms | > 1s | `curl -w "@curl-format.txt" http://api` |
| Database Connections | < 80% pool | > 90% | `psql <db> -c "SELECT count(*) FROM pg_stat_activity"` |
| Cache Hit Rate | > 80% | < 50% | `redis-cli INFO stats` |
| Disk Usage | < 70% | > 85% | `df -h` |

---

## Test Coverage Targets

| Component | Target | Current | Status |
|-----------|--------|---------|--------|
| Backend (Line/Branch) | 60% / 40% | 60% / 40% | ✅ Met |
| Frontend (Line/Branch) | 60% / 50% | 60% / 50% | ✅ Met |
| API Contract Tests | 39 tests | 39 tests | ✅ Complete |
| E2E Tests | TBD | TBD | 🟡 Planned |

---

## Related Documentation

**For Deep Dives**:
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Testing: [TEST_ORGANIZATION.md](TEST_ORGANIZATION.md)
- Security: [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- Development: [CLAUDE.md](../CLAUDE.md) (in repo root)

**For Deployment**:
- Full Checklist: [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
- Runbook: [deployment-runbook.md](runbooks/deployment-runbook.md)
- Rollback: [rollback-strategy.md](runbooks/rollback-strategy.md)

**For Code Review**:
- Contributing: [CONTRIBUTING.md](../CONTRIBUTING.md)
- PR Template: [.github/pull_request_template.md](../.github/pull_request_template.md)

---

**Last Updated**: 2026-06-25  
**Version**: 1.0  
**Printable**: ✅ Yes (markdown to PDF recommended)  
**Owner**: Staff Software Engineer
