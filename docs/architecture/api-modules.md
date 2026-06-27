# Parkflow API: Modular Architecture

**Status:** ✅ 100% Hexagonal Compliance (17/17 modules, 2026-06-27)  
**Last Updated:** 27 de junio de 2026

---

## Core Principles

1. **Hexagonal Structure (Ports & Adapters):**
   - **Domain:** Pure business logic, entities, and domain services. Zero dependencies on frameworks.
   - **Application:** Use Cases (Input Ports) and Repository Contracts (Output Ports). Orchestrates data flow.
   - **Infrastructure:** Implementation of Output Ports (JPA Adapters, External Services, Controllers).

2. **Strict Modularity:**
   - No circular dependencies between modules
   - Cross-module communication via Application Ports only
   - Shared types in `/common` module (DTOs, exceptions, utilities)

3. **Service Decomposition:**
   - **Maximum 5 public methods per service** (enforced in code review)
   - Each service = one business capability
   - Input ports define clear use case boundaries

---

## Complete Module Map (17 modules)

### Primary Modules (14)

| Module | Domain Entities | Main Responsibility | Input Ports | Output Ports | Dependencies |
|--------|---|---|---|---|---|
| **auth** | `AppUser`, `UserRole`, `AuthSession`, `RefreshToken` | Identity, authentication, JWT, device authorization | `LoginUseCase`, `RefreshTokenUseCase` | `UserRepositoryPort`, `DeviceRepositoryPort` | None (core) |
| **configuration** | `Rate`, `RoundingMode`, `ParkingSite`, `MonthlyContract`, `PaymentMethod`, `VehicleType` | Master data: rates, sites, users, themes, payment methods | `RateManagementUseCase`, `SiteManagementUseCase` | `RateRepositoryPort`, `SiteRepositoryPort` | `auth` (audit) |
| **parking.operation** | `ParkingSession`, `Receipt`, `Payment`, `Pricing` | Core flow: entry, exit, pricing, receipts | `EntryUseCase`, `ExitUseCase`, `PricingUseCase` | `SessionRepositoryPort`, `RateRepositoryPort` | `auth`, `configuration` |
| **parking.spaces** | `ParkingSpace`, `SpaceOccupancy`, `Capacity` | Space tracking, occupancy, capacity | `ListSpacesUseCase`, `ResizeCapacityUseCase` | `SpaceRepositoryPort` | `auth`, `configuration` |
| **parking.locker** | `Locker`, `LockerAssignment` | Locker management and assignment | `AssignLockerUseCase`, `FreeLockerUseCase` | `LockerRepositoryPort` | `auth`, `parking.spaces` |
| **cash** | `CashSession`, `CashMovement`, `CashRegister` | Cashier operations, movements, closing | `OpenCashSessionUseCase`, `RegisterMovementUseCase` | `CashRepositoryPort` | `auth`, `parking.operation` |
| **tickets** | `PrintJob`, `Ticket`, `TicketTemplate` | Print jobs, ticket management | `CreatePrintJobUseCase`, `ReprintTicketUseCase` | `PrintJobRepositoryPort` | `auth`, `parking.operation` |
| **billing** | `Invoice`, `InvoiceItem`, `PaymentEntry` | Billing, invoicing, revenue tracking | `GenerateInvoiceUseCase`, `RecordPaymentUseCase` | `InvoiceRepositoryPort` | `auth`, `parking.operation` |
| **sync** | `SyncEvent`, `SyncQueue` | Desktop↔API synchronization, event queuing | `PushEventsUseCase`, `PullEventsUseCase` | `SyncRepositoryPort` | `auth`, all domain modules |
| **audit** | `AuditLog`, `AuditTrail` | Centralized audit logging across modules | `LogAuditEventUseCase`, `QueryAuditTrailUseCase` | `AuditRepositoryPort` | `auth` |
| **licensing** | `License`, `LicenseKey`, `Activation` | License management, device activation | `ValidateLicenseUseCase`, `ActivateLicenseUseCase` | `LicenseRepositoryPort` | `auth` |
| **search** | (Elastic indices) | Full-text search across modules | `SearchSessionsUseCase`, `SearchInvoicesUseCase` | `SearchRepositoryPort` | `auth`, domain modules |
| **support** | `SupportTicket`, `SupportResponse` | Customer support workflow | `CreateSupportTicketUseCase`, `RespondTicketUseCase` | `SupportRepositoryPort` | `auth` |
| **reports** | (Dynamic report definitions) | Analytics, reporting, exports | `GenerateReportUseCase`, `ExportReportUseCase` | `ReportRepositoryPort` | `auth`, domain modules |

### Sub-modules (3) — all under `parking/`

| Sub-module | Part Of | Status |
|---|---|---|
| `parking/operation` | Parking core | ✅ 100% hexagonal |
| `parking/spaces` | Parking core | ✅ 100% hexagonal |
| `parking/locker` | Parking core | ✅ 100% hexagonal |

### Shared Module (1)

| Module | Purpose |
|--------|---------|
| **common** | DTOs, exceptions, constants, utilities (no business logic) |

---

## Key Architecture Decisions

### Decision 1: No God Services
**Why:** Modules >5 methods public = hard to test, maintain, understand.  
**Implementation:** Each capability = separate service with clear input port.  
**Example:**
```
❌ CashSessionService.open(), .close(), .move(), .query(), .summary(), .audit() = 6 methods
✅ OpenCashSessionService, CloseCashSessionService, CashSessionQueryService, etc.
```

**Inventory of Large Services** (pending decomposition, documented but not critical):
- `CashSessionManagementService` (475 lines) — opened, closed, queried together; candidate split: separate Query + Close
- `RegisterExitService` (465 lines) — pricing + receipt generation; candidate split: separate PricingCalculation
- `LicenseAuditService` (402 lines) — audit + license state; candidate split: separate StateQueryService

### Decision 2: DTOs Centralized
**Location:** `/common/dto/` (2026-06-24 consolidation)  
**Why:** Avoid duplication across modules.  
**Example DTOs:**
- `RateResponse`, `CreateRateRequest`, `UpdateRateRequest`
- `CashSessionResponse`, `CashMovementResponse`
- `ParkingSessionResponse`, `ReceiptResponse`
- `InvoiceResponse`, `PaymentEntryResponse`

### Decision 3: No Field Injection
**Rule:** Constructor injection only (final fields + @RequiredArgsConstructor).  
**Why:** Testable, transparent dependencies, immutable.

### Decision 4: Input/Output Ports Mandatory
**Why:** Clear contracts. Service not coupled to persistence.  
**Pattern:**
```java
// Input port = what module offers
public interface CreateRateUseCase { RateResponse create(...); }

// Output port = what module needs
public interface RateRepositoryPort { void save(Rate rate); }

// Service = implementation (hidden detail)
@Service class RateService implements CreateRateUseCase { ... }
```

---

## How to Add a New Feature

### Step 1: Choose Module
- Does feature fit existing module? (auth, configuration, parking, cash, etc.)
- Or create new module? (only if entirely separate domain)

### Step 2: Define Domain Entity (in `domain/`)
```java
public class Rate {
    private final UUID id;
    private final BigDecimal price;
    // Validation logic here, not in service
    private static void validate(BigDecimal price) {
        if (price.compareTo(ZERO) <= 0) {
            throw new InvalidRateException("Price must be positive");
        }
    }
}
```

### Step 3: Define Input Port (in `application/port/in/`)
```java
public interface CreateRateUseCase {
    RateResponse create(CreateRateRequest request);
}
```

### Step 4: Define Output Ports (in `application/port/out/`)
```java
public interface RateRepositoryPort {
    void save(Rate rate);
    Optional<Rate> findById(UUID id);
}
```

### Step 5: Implement Service (in `application/service/`)
```java
@Service
@RequiredArgsConstructor
public class RateManagementService implements CreateRateUseCase {
    private final RateRepositoryPort repository;
    private final AuditRepositoryPort audit;

    @Override
    public RateResponse create(CreateRateRequest request) {
        Rate rate = Rate.create(...);
        repository.save(rate);
        audit.log("Rate", "CREATE", ...);
        return toResponse(rate);
    }
}
```

### Step 6: Implement Adapter (in `infrastructure/persistence/`)
```java
@Component
@RequiredArgsConstructor
public class RateRepositoryAdapter implements RateRepositoryPort {
    private final RateJpaRepository jpaRepository;
    private final RateMapper mapper;

    @Override
    public void save(Rate rate) {
        jpaRepository.save(mapper.toEntity(rate));
    }
}
```

### Step 7: Expose via Controller (in `infrastructure/controller/`)
```java
@RestController
@RequiredArgsConstructor
public class RateController {
    private final CreateRateUseCase createUseCase;

    @PostMapping("/rates")
    public ResponseEntity<RateResponse> create(@RequestBody @Valid CreateRateRequest req) {
        return ResponseEntity.status(CREATED).body(createUseCase.create(req));
    }
}
```

### Step 8: Write Tests
- Domain: unit tests (no mocks, pure logic)
- Application: unit tests with mocked ports
- Infrastructure: integration tests with real database

---

## Module Dependency Graph

```
auth (core, no deps)
  ↓
configuration, audit, licensing, support (depend on auth)
  ↓
parking.operation (depends on auth, configuration)
  ↓
parking.spaces, parking.locker (depend on auth, configuration, parking.operation)
  ↓
cash, tickets, billing (depend on parking.operation)
  ↓
sync, search, reports (depend on multiple modules for data)
```

**Rule:** No backward dependencies. Lower-level modules don't know about upper-level.

---

## Testing Strategy

| Layer | Tool | Scope | Example |
|-------|------|-------|---------|
| **Domain** | JUnit 5 | Unit test entities, value objects | `RateTest`, `PricingValidationTest` |
| **Application** | JUnit 5 + Mockito | Unit test services, mock ports | `RateManagementServiceTest` (mocks repository) |
| **Infrastructure** | Spring Boot Test | Integration test adapters, real DB | `RateRepositoryAdapterTest` (@DataJpaTest) |
| **E2E** | Testcontainers | Real DB + service layer | `CreateRateFlowTest` |

---

## Common Pitfalls (See [ANTIPATTERNS.md](ANTIPATTERNS.md))

❌ `service/` directory at module root → Use `application/service/`  
❌ Services >5 public methods → Split by use case  
❌ Facades like `RateFacadeService` → Use individual input ports  
❌ Field injection → Use constructor injection  
❌ Business logic in controllers → Use services  
❌ Entities exposed in API → Use DTOs  
❌ Repositories in module root → Use `infrastructure/persistence/`

---

## References

- [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md) — Complete guide to module structure
- [ANTIPATTERNS.md](ANTIPATTERNS.md) — What NOT to do
- [CLAUDE.md - Hexagonal Architecture](../../CLAUDE.md) — Mandatory standards
- [STRUCTURAL_COMPLIANCE_REPORT.md](../STRUCTURAL_COMPLIANCE_REPORT.md) — Current state (17/17 compliant)
