# Arquitectura General de ParkFlow

**Status:** ✅ Production-Ready (2026-06-27)  
**Monorepo:** pnpm workspaces  
**Scale:** 17 backend modules, 100% hexagonal architecture

---

## 🏗️ C4 Model: System Context

```
┌─────────────────────────────────────────────────────────────┐
│                      External Systems                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │   Payment    │  │   Insurance  │  │   Analytics    │    │
│  │  Gateway     │  │   Provider   │  │  Service       │    │
│  └──────────────┘  └──────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                             ↑
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                     ↓
   ┌─────────┐         ┌──────────┐        ┌──────────┐
   │ Desktop │         │   Web    │        │   API    │
   │ (Tauri) │         │(Next.js) │        │(Spring)  │
   │ Linux   │         │ Admin    │        │ Core     │
   │ Windows │         │ Panel    │        │ SaaS     │
   │ macOS   │         │Reports   │        │Database  │
   └─────────┘         └──────────┘        └──────────┘
        ↑                    ↑                     ↑
        └────────────────────┼─────────────────────┘
                      User (Parking Manager)
```

---

## 🏭 Three-Tier Architecture

### 1. **Desktop App (Tauri + Rust)**
- **Purpose:** Offline-first parking operations
- **Capabilities:**
  - Register vehicle entries/exits (offline)
  - Print tickets locally
  - Camera QR scanning
  - Sync with API when online
- **Tech:** Tauri 2, Rust, SQLite local DB
- **Deployment:** Standalone executables (Windows, macOS, Linux)
- **Connectivity:** Optional cloud sync

### 2. **Web Admin Panel (Next.js + TypeScript)**
- **Purpose:** Centralized management & configuration
- **Capabilities:**
  - Multi-tenant company management
  - Rate configuration
  - User & role management
  - Reports & analytics
  - License management
  - Device authorization
- **Tech:** Next.js 15, TypeScript, Tailwind CSS, HeroUI v3
- **Deployment:** Vercel or self-hosted (Node.js)
- **API Client:** Calls Spring Boot API

### 3. **Backend API (Spring Boot 3 + Java 21)**
- **Purpose:** Multi-tenant SaaS core
- **Capabilities:**
  - Authentication & authorization
  - Parking operations (entry/exit)
  - Billing & invoicing
  - License validation & activation
  - Centralized audit logging
  - Desktop ↔ Web sync
  - Full-text search
- **Tech:** Spring Boot 3, Spring Data JPA, PostgreSQL 16, Redis
- **Deployment:** Docker containers, Kubernetes-ready
- **Database:** PostgreSQL (multi-tenant with RLS policies)

---

## 🔄 Data Flow Across Apps

### Scenario 1: Vehicle Entry (Parking Manager uses Desktop)

```
[Desktop App] 
  → Register entry (offline) → SQLite
  → When online, sync to API
[Spring Boot API]
  → Validate entry
  → Assign pricing rules
  → Create ParkingSession
  → Log to audit
  → Return to Desktop
[Desktop App]
  → Store confirmation
  → Print ticket
```

### Scenario 2: Rate Configuration (Admin uses Web)

```
[Web Admin Panel]
  → Configure new rate
  → Submit POST /api/v1/configuration/rates
[Spring Boot API]
  → Validate rate
  → Check overlaps
  → Persist to PostgreSQL
  → Publish event (sync topic)
  → Return success
[Desktop App]
  → Pull sync events
  → Update local rates in SQLite
  → Available for next session
```

### Scenario 3: Billing (Nightly batch)

```
[Spring Boot API - Scheduled Job]
  → Query sessions from today
  → Calculate invoices
  → Persist invoices
  → Send to external billing system
[Web Admin Panel]
  → Display invoices
  → Allow exports/edits
```

---

## 🔐 Authentication & Authorization

```
[Device/Web Client]
  → POST /api/v1/auth/login
[API]
  → Validate credentials (AppUser)
  → Issue JWT + RefreshToken
  → Return sessionId
[Client]
  → Store JWT in localStorage/secure storage
  → Send JWT in Authorization header
[API]
  → Validate JWT
  → Check tenant_id (multi-tenant row-level security)
  → Route to correct company data
```

**Levels:**
1. **ROLE-based** (deprecated): USER, ADMIN, SUPER_ADMIN
2. **AUTHORITY-based** (new): RATE_READ, RATE_WRITE, INVOICE_READ, etc.

---

## 💾 Database Architecture

### PostgreSQL Multi-Tenant Design

```sql
-- Baseline schema (V001__initial_schema.sql)
├── companies (tenants)
├── app_users
├── auth_sessions
├── parking_sessions
├── vehicles
├── rates
├── invoices
├── cash_sessions
└── 75+ more tables

-- Row-Level Security (RLS) enabled on:
├── companies
├── app_users
├── parking_sessions
├── vehicles
├── rates
├── invoices
├── payment_methods
├── cash_sessions
└── ... (10 multi-tenant tables with RLS policies)
```

**Isolation:** Every query automatically filtered by `app.tenant_id` context variable.

```sql
-- Example RLS policy
CREATE POLICY rls_parking_sessions ON parking_sessions TO parkflow_app
USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

### Flyway Migration Strategy

- **V001:** Complete baseline (squashed from V001-V039)
- **V002+:** Incremental migrations as features added
- **Pattern:** Semantic versioning + descriptive names

Example: `V040__add_capacity_tracking.sql`

---

## 🏛️ Backend Modular Architecture (Hexagonal)

**17 modules, 100% compliant hexagonal structure**

```
modules/
├── auth/                   (Identity & access control)
├── configuration/          (Rates, sites, payment methods)
├── parking/                (Core operations)
│   ├── operation/          (Entry/Exit pricing)
│   ├── spaces/             (Space occupancy tracking)
│   └── locker/             (Locker management)
├── cash/                   (Cashier operations)
├── billing/                (Invoicing & revenue)
├── tickets/                (Print job management)
├── sync/                   (Desktop ↔ API sync)
├── audit/                  (Centralized logging)
├── licensing/              (License validation)
├── customers/              (Customer management)
├── search/                 (Full-text search)
├── support/                (Support tickets)
├── reports/                (Analytics & exports)
└── common/                 (Shared DTOs, exceptions)
```

**Each module follows:**
```
<module>/
├── domain/                 (Pure business logic)
├── application/            (Use cases & ports)
├── infrastructure/         (Controllers, adapters)
└── test/                   (Unit & integration tests)
```

**See:** [api-modules.md](api-modules.md), [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md)

---

## 🔌 Integration Points

### Desktop ↔ API
- **Protocol:** HTTP REST + JSON
- **Sync Mechanism:** Event queues + pull/push operations
- **Offline Queue:** SQLite → batch sync when online
- **Ports:** 6011 (primary), 6012 (fallback)

### Web ↔ API
- **Protocol:** HTTP REST + JSON
- **Auth:** JWT stored in localStorage
- **Base URLs:** `/api/v1/operations`, `/api/v1/configuration`
- **Ports:** 6001 (web), 6011 (API)

### API ↔ External Services
- **Payment Gateway:** Webhook endpoints
- **Analytics:** Event streaming (optional)
- **Email/SMS:** Notification service integration

---

## 🚀 Deployment Architecture

### Development (Local)

```
Docker Compose
├── PostgreSQL:6021
├── Redis:6031
├── Spring Boot API:6011
└── (Next.js dev server:6001)
```

**Setup:** `pnpm db:up && pnpm dev:api && pnpm dev:web`

### Production (Cloud-Ready)

```
Kubernetes Cluster
├── PostgreSQL (managed, e.g., AWS RDS)
├── Redis (managed, e.g., ElastiCache)
├── Spring Boot (docker image, replicas)
├── Next.js (Vercel or docker + nginx)
└── Desktop (downloadable executables with auto-update)
```

**Container Registry:** Docker Hub / ghcr.io  
**CI/CD:** GitHub Actions  
**IaC:** Terraform (optional)

---

## 🎯 Key Design Decisions

1. **Monorepo over Microservices**
   - Single versioning story
   - Unified testing & deployment
   - Desktop + Web + API in sync

2. **Hexagonal Architecture**
   - Clear separation: domain, application, infrastructure
   - Testable without frameworks
   - Easy refactoring (change adapters, not domain)

3. **PostgreSQL Multi-Tenant with RLS**
   - Cheaper than separate databases per tenant
   - Stronger isolation than application-level filtering
   - Data breach = only one tenant's data at risk

4. **JWT + Local Storage (Frontend)**
   - Stateless API
   - Offline capability
   - Note: Security debt; migration to httpOnly cookies pending

5. **No Facades or God Services**
   - Each service = one use case
   - Clear input/output ports
   - Easy to test in isolation

---

## 📚 Documentation References

- **Detailed Module Guide:** [api-modules.md](api-modules.md)
- **How to Structure a Module:** [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md)
- **What NOT to Do:** [ANTIPATTERNS.md](ANTIPATTERNS.md)
- **Current Compliance Status:** [STRUCTURAL_COMPLIANCE_REPORT.md](../STRUCTURAL_COMPLIANCE_REPORT.md)
- **Database Migrations:** [CLAUDE.md - Migration Strategy](../../CLAUDE.md)
- **Offline Specifications:** [offline-printing-v1.md](offline-printing-v1.md)
- **Auth Architecture:** [auth/ARCHITECTURE_V2.md](../auth/ARCHITECTURE_V2.md)

---

## 🔗 See Also

- [decisions.md](decisions.md) — Architecture Decision Records
- [ports.md](ports.md) — Network port configuration
- [contributing/CONTRIBUTING.md](../contributing/CONTRIBUTING.md) — Development workflow
