# ADR-0001: Hexagonal Architecture (Ports & Adapters)

**Status**: Accepted  
**Date**: 2026-06-25  
**Version**: 1.0  

---

## Context

ParkFlow is a mission-critical hybrid parking management system serving:
- 100+ parking facilities simultaneously
- Online/offline operation seamlessly (local-first)
- Multi-tenant operations with strict data isolation
- Enterprise security and audit requirements
- Future integrations with third-party billing, licensing, and reporting systems

The monorepo includes multiple applications:
- **Backend API** (Spring Boot 3): 207 services/use cases, 49 controllers, 111 ports
- **Web Admin** (Next.js): Configuration, reporting, user management
- **Desktop Client** (Tauri): Point-of-sale, offline operations, hardware integration
- **Print Agent** (Node.js): Thermal printer support

Early architecture used layered/service patterns, which created:
- **Tight coupling** between controllers and business logic
- **God services** (>15 methods, mixing unrelated concerns)
- **Testing difficulty** (hard to mock external dependencies)
- **Integration challenges** (new provider? Must modify 5+ files)
- **Framework lock-in** (Spring Boot knowledge required everywhere)

---

## Decision

**Adopt Hexagonal Architecture (Ports & Adapters) as the canonical pattern for all backend modules.**

### Core Principles

1. **Dependency Inversion**: Business logic depends on abstractions (ports), not concrete implementations
2. **Isolation**: Domain logic isolated from frameworks, databases, and HTTP concerns
3. **Testability**: Plug in test doubles (mocks, stubs) without framework machinery
4. **Flexibility**: Swap implementations (SQL ↔ MongoDB, REST ↔ gRPC, Sync ↔ Event-driven)
5. **Scalability**: Add features without modifying existing code (Open/Closed Principle)

### Required Structure (MANDATORY for ALL modules)

Every backend module MUST follow this exact structure:

```
modules/<module-name>/
├── application/
│   ├── usecase/                  # Business logic grouped by capability
│   │   ├── <Feature>UseCase.java
│   │   └── <Feature>Service.java
│   ├── port/
│   │   ├── in/                   # Input ports (use case interfaces)
│   │   │   └── <Feature>PortIn.java
│   │   └── out/                  # Output ports (persistence/service contracts)
│   │       └── <Feature>RepositoryPort.java
│   └── dto/                      # Application transfer objects
├── domain/
│   ├── <bounded-context>/        # e.g., rate/, vehicle/, payment/
│   │   ├── <Entity>.java
│   │   ├── <ValueObject>.java
│   │   └── <DomainService>.java  # RARE
│   ├── exception/
│   └── shared/
├── infrastructure/
│   ├── controller/               # HTTP REST endpoints
│   │   └── <Feature>Controller.java
│   ├── persistence/              # JPA repositories + adapters
│   │   ├── <Entity>JpaRepository.java
│   │   ├── <Entity>RepositoryAdapter.java
│   │   └── mapper/
│   ├── event/                    # Event handlers
│   └── config/
└── test/                         # Tests mirroring structure
```

### Naming Conventions

| Layer | Pattern | Example |
|-------|---------|---------|
| Input Ports | `<Feature>PortIn` | `CashSessionOpenPortIn` |
| Output Ports | `<Feature>RepositoryPort` | `CashSessionRepositoryPort` |
| Use Cases | `<Feature>UseCase` or `<Feature>Service` | `OpenCashSessionService` |
| Controllers | `<Feature>Controller` | `CashSessionController` |
| Repositories | `<Entity>JpaRepository` + `<Entity>RepositoryAdapter` | `CashSessionJpaRepository`, `CashSessionRepositoryAdapter` |
| Domain Entities | `<Entity>` | `CashSession`, `CashMovement` |
| Domain Events | `<Event>` | `CashSessionOpenedEvent` |
| Exceptions | `<Type>Exception` | `CashSessionException`, `InsufficientFundsException` |

---

## Consequences

### Positive

✅ **Testability**: Business logic tested without HTTP, database, or Spring Boot
```java
// ❌ Before: Hard to test
CashSessionService service = new CashSessionService(new RealDatabase(), new RealEmailService());

// ✅ After: Easy to test
OpenCashSessionUseCase service = new OpenCashSessionService(
  mock(CashSessionRepositoryPort.class),
  mock(NotificationPortOut.class)
);
```

✅ **Flexibility**: Swap billing providers without touching domain logic
```java
// Old: BillingIntegrationService.java with 8 methods for 3 different providers
// New: Separate ports
interface InvoiceProviderPortOut { void sendInvoice(...); }
class BillingProviderAAdapter implements InvoiceProviderPortOut { ... }
class BillingProviderBAdapter implements InvoiceProviderPortOut { ... }
// Switch at runtime or in config
```

✅ **Clarity**: Each class has one reason to change
```java
// Before: ConfigurationService (12 methods, 5 concerns)
// After:
- RateManagementService (4 methods, 1 concern)
- VehicleTypeManagementService (4 methods, 1 concern)
- PaymentMethodManagementService (3 methods, 1 concern)
```

✅ **Scalability**: Add new features without refactoring existing code
```java
// New feature: SmsNotifications
interface NotificationPortOut {
  void sendEmail(...);
  void sendSms(...);    // Add this port without touching CashSessionService
}

// New requirement: Audit all SMS
@Aspect
class SmsAuditAspect {
  @Around("execution(* *..NotificationPortOut.sendSms(..))")
  void auditSms(...) { ... }
}
```

### Negative

❌ **More Files**: 1 feature may require 5+ files (port interface, service, repository adapter, mapper, test)
- Mitigation: Tool support (IDE templates, code generation) and clear naming conventions

❌ **Learning Curve**: Developers unfamiliar with hexagonal architecture need 2-3 days onboarding
- Mitigation: Strong code review enforcement, architectural runbooks, peer pairing on first task

❌ **Performance Overhead**: Extra interface indirection (negligible in practice)
- Mitigation: Java 21 inlining + profiler validation; never a bottleneck in production

❌ **Code Duplication**: Mappers between domain, application, and infrastructure layers
- Mitigation: Utility `BeanMapper`, code generation tools, careful API design

---

## Alternatives Considered

### 1. Layered Architecture (REJECTED)
```
controller → service → repository → domain
```
**Why Rejected**:
- Layers become increasingly thick (services grow to 15+ methods)
- Hard to test services without mocking database
- External integrations (billing, SMS) live in services, mixing concerns
- Tight coupling: changing service signature breaks multiple controllers

### 2. Anemic Domain Model (REJECTED)
```
Entity (bare getters/setters) ← Service (all business logic)
```
**Why Rejected**:
- Rich domain knowledge scattered across services
- Harder to reason about what's valid (where do validations live?)
- No language to express domain concepts
- Difficult to refactor; domain logic hidden in procedural code

### 3. CQRS (Command Query Responsibility Segregation) (DEFERRED)
```
Commands (WriteModel) ← Separate → Queries (ReadModel)
```
**Why Deferred**:
- Valid for large-scale systems; ParkFlow not yet at that scale
- Initial simpler hexagonal pattern sufficient
- Can adopt CQRS later by splitting read/write ports further
- Example: `CashSessionReadPortOut` (queries) vs `CashSessionWritePortOut` (commands)

### 4. Event Sourcing (DEFERRED)
```
Aggregate emits events; repo rebuilds from event log
```
**Why Deferred**:
- Adds significant complexity for still-small domains
- Audit requirements (why something changed) better served by AuditLogService
- Can adopt later if audit trails become complex
- Current approach sufficient for compliance needs

---

## Implementation Roadmap

### Phase 1: Core Modules (✅ COMPLETE)
- Configuration (rates, users, vehicles, themes, sites)
- Parking (operations, locker, spaces)
- Licensing (validation, activation)
- Auth (authentication, authorization)

### Phase 2: Integration Modules (✅ COMPLETE)
- Cash (session, movement, register)
- Onboarding (setup, wizard)
- Sync (push, pull, reconciliation)

### Phase 3: Enhanced Modules (IN PROGRESS)
- Billing (invoicing, providers)
- Search (multi-provider, scoped)
- Reports (daily ops, occupancy, revenue)

### Phase 4: Real-Time (PLANNED)
- WebSocket events for live dashboards
- Event-driven notifications
- Multi-tenant broadcast safety

---

## Validation Checklist

Before committing ANY new module, verify:

```
[ ] application/usecase/ exists with ≤5 methods per service
[ ] application/port/in/ defines input port interfaces
[ ] application/port/out/ defines output port interfaces
[ ] domain/ has entities in bounded-context folders
[ ] domain/exception/ has custom exceptions
[ ] infrastructure/controller/ has REST endpoints
[ ] infrastructure/persistence/ has JPA repos + adapters
[ ] Mapper.java exists for entity ↔ DTO conversions
[ ] No service/ directory at module root (PROHIBITED)
[ ] No presentation/ directory (use infrastructure/controller/)
[ ] Tests mirror application structure
[ ] All imports reference canonical paths
```

---

## Trade-offs

| Aspect | Hexagonal | Layered |
|--------|-----------|---------|
| **Testability** | Excellent (ports can be mocked) | Poor (must mock database) |
| **Coupling** | Low (depends on abstractions) | High (depends on implementations) |
| **Learning Curve** | Moderate (3 days) | Shallow (1 day) |
| **File Count** | Higher (5+ per feature) | Lower (2-3 per feature) |
| **IDE Support** | Good (clear dependencies) | Mixed (unclear what depends on what) |
| **Enterprise Integrations** | Easy (adapters for providers) | Hard (modify services) |

---

## Related ADRs

- [ADR-0002: God Service Elimination](0002-god-service-elimination.md) — Size limits for services
- [ADR-0003: Authentication Strategy](0003-authentication-strategy.md) — JWT + ports for auth
- [ADR-0004: Multi-Tenant RLS](0004-multi-tenant-rls.md) — Data isolation via ports
- [ADR-0007: Test Infrastructure](0007-test-infrastructure.md) — H2 vs Testcontainers for ports

---

## References

- **Alistair Cockburn**: [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) (2005)
- **Mark Richards**: [Ports & Adapters Pattern](https://www.oreilly.com/library/view/fundamentals-of-software-architecture/9781492043447/) in Fundamentals of Software Architecture
- **Domain-Driven Design**: Eric Evans (2003) — Bounded Contexts, Ubiquitous Language
- **Spring Framework**: Dependency Injection & Ports via interfaces

---

**Last Updated**: 2026-06-25  
**Maintainer**: Staff Software Engineer (Architecture Review)  
**Enforcement**: Mandatory for all backend modules (code review checkpoints)
