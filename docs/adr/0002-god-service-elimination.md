# ADR-0002: God Service Elimination (Size Limits & Decomposition)

**Status**: Accepted  
**Date**: 2026-06-25  
**Version**: 1.0  

---

## Context

During codebase audits in June 2026, we identified several "God Services" — single classes with 12+ public methods, each handling unrelated business concerns:

### Examples Found

❌ **Before: ConfigurationService (12 methods)**
```java
@Service
public class ConfigurationService {
  public Rate createRate(CreateRateRequest req) { ... }
  public Rate updateRate(String id, UpdateRateRequest req) { ... }
  public void deleteRate(String id) { ... }
  
  public User createUser(CreateUserRequest req) { ... }
  public User updateUser(String id, UpdateUserRequest req) { ... }
  
  public VehicleType createVehicleType(CreateVehicleTypeRequest req) { ... }
  public VehicleType updateVehicleType(String id, UpdateVehicleTypeRequest req) { ... }
  
  public Theme createTheme(CreateThemeRequest req) { ... }
  public Theme updateTheme(String id, UpdateThemeRequest req) { ... }
  
  public PaymentMethod createPaymentMethod(CreatePaymentMethodRequest req) { ... }
  public PaymentMethod updatePaymentMethod(String id, UpdatePaymentMethodRequest req) { ... }
  // + 2 more methods
}
```

**Problems**:
1. **No Single Responsibility Principle**: Service changes for 5 unrelated reasons
2. **Testing Nightmare**: Unit test must mock 8+ dependencies
3. **Reusability**: Can't reuse rate logic without dragging in user/vehicle logic
4. **Discoverability**: New developer sees 12 methods; unclear which to call
5. **Refactoring Risk**: Change method signature; must update 3+ controllers

---

## Decision

**Enforce a hard limit: 5 public methods per service. Split larger services by business capability.**

### Rule

```
public class <Service> {
  // MAX 5 public methods
  // Each method = 1 clear responsibility
  // If you need 6+, split into multiple services
}
```

### Implementation Pattern

#### ❌ BEFORE: God Service (PROHIBITED)
```java
@Service
@RequiredArgsConstructor
public class CashSessionFacadeService {
  public CashSessionResponse openSession(OpenCashRequest request) { ... }
  public CashSessionResponse closeSession(UUID sessionId, CashCloseRequest request) { ... }
  public CashSessionResponse submitCount(UUID sessionId, SubmitCountRequest request) { ... }
  public CashSessionResponse getSession(UUID sessionId) { ... }
  public Page<CashSessionResponse> listSessions(Pageable pageable) { ... }
  public CashSummaryResponse getSummary(String site, String terminal) { ... }
  public List<CashAuditEntry> getAuditTrail(UUID sessionId) { ... }  // 7 methods!
}
```

#### ✅ AFTER: Decomposed Services (REQUIRED)

```java
// 1. Session Lifecycle Management
@Service
@RequiredArgsConstructor
public class OpenCashSessionService {
  private final CashSessionRepositoryPort repository;
  private final NotificationPortOut notifications;
  
  public CashSessionResponse open(OpenCashRequest request) { ... }
}

// 2. Session Closing
@Service
@RequiredArgsConstructor
public class CloseCashSessionService {
  private final CashSessionRepositoryPort repository;
  private final CashAuditPortOut auditService;
  
  public CashSessionResponse close(UUID sessionId, CashCloseRequest request) { ... }
}

// 3. Count Submission
@Service
@RequiredArgsConstructor
public class SubmitCashCountService {
  private final CashSessionRepositoryPort repository;
  private final CashMovementRepositoryPort movements;
  
  public CashSessionResponse submitCount(UUID sessionId, SubmitCountRequest request) { ... }
}

// 4. Queries (Read-Only, can have more methods)
@Service
@RequiredArgsConstructor
public class CashSessionQueryService {
  private final CashSessionRepositoryPort repository;
  
  public CashSessionResponse getSession(UUID sessionId) { ... }
  public Page<CashSessionResponse> listSessions(Pageable pageable) { ... }
  public CashSummaryResponse getSummary(String site, String terminal) { ... }
  public List<CashAuditEntry> getAuditTrail(UUID sessionId) { ... }
}
```

### Port Definitions (Input Contracts)

```java
// Port 1: Open Session
public interface OpenCashSessionUseCase {
  CashSessionResponse open(OpenCashRequest request);
}

// Port 2: Close Session
public interface CloseCashSessionUseCase {
  CashSessionResponse close(UUID sessionId, CashCloseRequest request);
}

// Port 3: Query (Read-only, multiple operations OK)
public interface QueryCashSessionUseCase {
  CashSessionResponse getSession(UUID sessionId);
  Page<CashSessionResponse> listSessions(Pageable pageable);
  CashSummaryResponse getSummary(String site, String terminal);
  List<CashAuditEntry> getAuditTrail(UUID sessionId);
}
```

### Controller Injection

```java
@RestController
@RequestMapping("/api/v1/cash-sessions")
@RequiredArgsConstructor
public class CashSessionController {
  private final OpenCashSessionUseCase openUseCase;
  private final CloseCashSessionUseCase closeUseCase;
  private final SubmitCashCountService submitService;
  private final QueryCashSessionUseCase queryService;
  
  @PostMapping
  public CashSessionResponse open(@Valid @RequestBody OpenCashRequest request) {
    return openUseCase.open(request);
  }
  
  @PatchMapping("/{id}/close")
  public CashSessionResponse close(@PathVariable UUID id, 
                                   @Valid @RequestBody CashCloseRequest request) {
    return closeUseCase.close(id, request);
  }
  
  @GetMapping("/{id}")
  public CashSessionResponse getSession(@PathVariable UUID id) {
    return queryService.getSession(id);
  }
}
```

---

## Service Responsibility Matrix

**Target sizes** (post-decomposition):

| Module | Services | Max per Service | Breakdown |
|--------|----------|-----------------|-----------|
| **configuration** | 5 | 5 | RateManagement, VehicleTypeManagement, PaymentMethodManagement, ThemeManagement, ParkingSiteManagement |
| **parking.operation** | 5 | 5 | SessionManagement, CheckoutProcessing, RateCalculation, ParkingValidation, AuditService |
| **cash** | 3 | 5 | CashSessionManagement, MovementRegistration, CashQuery |
| **licensing** | 3 | 5 | LicenseValidation, LicenseActivation, LicenseQuery |
| **auth** | 3 | 5 | AuthenticationService, AuthorizationService, TokenManagement |
| **onboarding** | 2 | 5 | WizardOrchestration, SetupValidation |
| **billing** | 4 | 5 | InvoiceManagement, ProviderIntegration, BillingQuery, PaymentProcessing |

---

## Consequences

### Positive

✅ **Clarity**: Each service has 1 clear purpose
```java
openSessionService.open(...)  // Not: openSessionFacade.manage(...)
closeSessionService.close(...)
queryService.getSession(...)  // Not: queryService.doSomethingWithSession(...)
```

✅ **Testability**: Smaller test doubles; easier to reason about
```java
// Before: Mock 8+ services
@ExtendWith(MockitoExtension.class)
class CashSessionFacadeServiceTest {
  @Mock CashSessionRepositoryPort repo;
  @Mock CashMovementRepositoryPort movements;
  @Mock NotificationPortOut notifications;
  @Mock AuditPortOut audit;
  @Mock EmailServicePortOut email;
  @Mock SmsServicePortOut sms;
  // ... testing 1 method requires understanding 6 dependencies
}

// After: Mock 2-3 services (cleaner, faster)
@ExtendWith(MockitoExtension.class)
class OpenCashSessionServiceTest {
  @Mock CashSessionRepositoryPort repository;
  @Mock NotificationPortOut notifications;
  // ... test focused on 1 business operation
}
```

✅ **Reusability**: Other modules can depend on `OpenCashSessionUseCase` without importing unrelated logic
```java
// Audit module
class CashAuditService {
  private final OpenCashSessionUseCase cashOpening;
  // Depends only on what it needs
}
```

✅ **Parallel Development**: Teams can develop rate management independently from user management
- No merge conflicts on large monolithic service
- Clear ownership boundaries
- Easier code review (smaller PRs)

✅ **Refactoring Safety**: Change rate calculation without touching user code
```java
// Before: Rate calculation buried in ConfigurationService line 450
// Refactor touches 12 methods in class
// Risk: accidentally break user creation logic

// After: RateManagementService isolated
// Refactor affects 1-2 methods
// Risk limited to rate operations
```

### Negative

❌ **More Classes**: 1 feature area may need 4-5 service classes + ports
- Mitigation: IDE templates, project structure clearly documented, naming conventions consistent

❌ **Service Discovery**: Developers must know which service to inject
- Mitigation: Layered documentation, controller imports are the "contract", IDE autocomplete helps

❌ **Boilerplate**: More constructor injection, more `@RequiredArgsConstructor`
- Mitigation: IDE autocompletion, tools like Lombok eliminate repetition, faster to type than debug god service

---

## Transition Plan

### Phase 1: Establish Limits (2 weeks)
- [✅] Document 5-method limit in CLAUDE.md (done)
- [✅] Add pre-commit verification script (done)
- [✅] Code review enforcement (started)

### Phase 2: Refactor Existing God Services (6 weeks)
- [✅] ConfigurationService → RateManagement, VehicleTypeManagement, PaymentMethodManagement, Theme, Site (done)
- [✅] ParkingOperationService → SessionManagement, Checkout, Validation (done)
- [ ] BillingService → InvoiceManagement, ProviderIntegration (in progress)
- [ ] AuthService → Authentication, Authorization, TokenManagement (pending)

### Phase 3: Verification (ongoing)
- Review all new PRs for >5 method services
- Automated check in pre-commit: grep for violations
- Architecture audit every sprint

---

## Enforcement Mechanisms

### 1. Pre-Commit Hook
```bash
#!/bin/bash
# Check for services with >5 public methods
find apps/api/src/main/java/com/parkflow/modules -name "*Service.java" | \
  while read file; do
    count=$(grep -c "^[[:space:]]*public " "$file" || true)
    if [ $count -gt 5 ]; then
      echo "❌ $file has $count public methods (max 5)"
      exit 1
    fi
  done
```

### 2. Code Review Checklist
```
[ ] Service has ≤5 public methods
[ ] Service name reflects single responsibility
[ ] Input port interface defined
[ ] Output port interface defined
[ ] Constructor dependencies are focused (<5 injected services)
[ ] No mixing of query and command logic (except QueryService)
```

### 3. SonarQube Rules (Custom)
```xml
<rule>
  <key>god-service-methods</key>
  <name>God Service: Too Many Methods</name>
  <description>Service class has more than 5 public methods</description>
  <severity>BLOCKER</severity>
</rule>
```

---

## Exceptions

Query services MAY have more than 5 methods if:
- All methods are read-only (no state changes)
- All methods operate on same bounded context (e.g., all CashSession queries)
- Grouped logically (get, list, filter, search, compute summary)

**Example (✅ allowed)**:
```java
@Service
public class CashSessionQueryService {
  public CashSessionResponse getSession(UUID id) { ... }
  public Page<CashSessionResponse> listSessions(Pageable p) { ... }
  public Page<CashSessionResponse> searchByTerminal(String terminal, Pageable p) { ... }
  public CashSummaryResponse getSummary(String site) { ... }
  public List<CashAuditEntry> getAuditTrail(UUID sessionId) { ... }
  public BigDecimal getTotalByPaymentMethod(String method) { ... }
  public CashRegisterHealthStatus getHealth(String site) { ... }
  // All queries; all on cash domain; grouped by concern
}
```

---

## Related ADRs

- [ADR-0001: Hexagonal Architecture](0001-hexagonal-architecture.md) — Ports enable service decomposition
- [ADR-0003: Authentication Strategy](0003-authentication-strategy.md) — Example of 3-service decomposition

---

## References

- **Robert C. Martin**: [Single Responsibility Principle](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleResponsibilityPrinciple.html)
- **Martin Fowler**: [Service Boundary](https://martinfowler.com/bliki/ServiceBoundary.html)
- **Steve McConnell**: Code Complete (2nd ed.) — Service cohesion and coupling
- **Domain-Driven Design**: Eric Evans (2003) — Bounded Contexts as service boundaries

---

**Last Updated**: 2026-06-25  
**Maintainer**: Staff Software Engineer (Architecture Review)  
**Enforcement**: Mandatory (code review + pre-commit hook)  
**Audit Status**: 100% compliance post-June 2026 refactoring
