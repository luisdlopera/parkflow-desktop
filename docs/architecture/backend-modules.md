# Backend Modules: Complete Reference

**Status:** ✅ All 17 modules 100% hexagonal compliant (2026-06-27)  
**Architecture:** Hexagonal (ports & adapters)  
**Total Modules:** 14 primary + 3 parking sub-modules

---

## 📋 Module Overview

### 14 Primary Modules (Non-Parking)

| Module | Responsibility | Primary Entities | Input Ports | Output Ports | Team Owner |
|--------|---|---|---|---|---|
| **auth** | Identity & access control | AppUser, UserRole, AuthSession, RefreshToken, DeviceAuthorization | LoginUseCase, RefreshTokenUseCase, DeviceAuthorizationUseCase | UserRepositoryPort, DeviceRepositoryPort, TokenRepositoryPort | Platform |
| **configuration** | Master data: rates, sites, payment methods, vehicle types | Rate, RoundingMode, ParkingSite, MonthlyContract, PaymentMethod, VehicleType | RateManagementUseCase, SiteManagementUseCase, PaymentMethodManagementUseCase | RateRepositoryPort, SiteRepositoryPort, PaymentMethodRepositoryPort | Configuration |
| **parking.operation** | Entry/exit, pricing, receipts | ParkingSession, Receipt, Payment, Pricing | EntryUseCase, ExitUseCase, PricingCalculationUseCase, SessionQueryUseCase | SessionRepositoryPort, RateQueryPort, PricingCalculationPort | Operations |
| **parking.spaces** | Space occupancy tracking | ParkingSpace, SpaceOccupancy, Capacity | ListSpacesUseCase, ResizeCapacityUseCase, OccupancyQueryUseCase | SpaceRepositoryPort | Operations |
| **parking.locker** | Locker management | Locker, LockerAssignment | AssignLockerUseCase, FreeLockerUseCase | LockerRepositoryPort | Operations |
| **cash** | Cashier operations, movements | CashSession, CashMovement, CashRegister | OpenCashSessionUseCase, CloseCashSessionUseCase, RegisterCashMovementUseCase | CashRepositoryPort | Finance |
| **billing** | Invoicing, revenue tracking | Invoice, InvoiceItem, PaymentEntry | GenerateInvoiceUseCase, RecordPaymentUseCase | InvoiceRepositoryPort, PaymentRepositoryPort | Finance |
| **tickets** | Print job management | PrintJob, Ticket, TicketTemplate | CreatePrintJobUseCase, ReprintTicketUseCase | PrintJobRepositoryPort | Operations |
| **audit** | Centralized audit logging | AuditLog, AuditTrail | LogAuditEventUseCase, QueryAuditTrailUseCase | AuditRepositoryPort | Platform |
| **licensing** | License management, activation | License, LicenseKey, Activation | ValidateLicenseUseCase, ActivateLicenseUseCase, HeartbeatUseCase | LicenseRepositoryPort, CryptographyPort | Licensing |
| **customers** | Customer (company) management | Company, Subscription, Plan | CreateCompanyUseCase, UpdateCompanyUseCase | CompanyRepositoryPort | Sales |
| **search** | Full-text search | (Elastic indices) | SearchSessionsUseCase, SearchInvoicesUseCase | SearchRepositoryPort | Platform |
| **support** | Customer support workflow | SupportTicket, SupportResponse | CreateSupportTicketUseCase, RespondTicketUseCase | SupportRepositoryPort | Support |
| **reports** | Analytics, reporting | (Dynamic definitions) | GenerateReportUseCase, ExportReportUseCase | ReportRepositoryPort, ExportServicePort | Analytics |

### 3 Parking Sub-modules

Located under `modules/parking/`:
- `parking/operation` — Entry/exit core logic (belongs in primary table above)
- `parking/spaces` — Space occupancy (belongs in primary table above)
- `parking/locker` — Locker management (belongs in primary table above)

### 1 Shared Module

| Module | Purpose |
|--------|---------|
| **common** | Centralized DTOs, exceptions, constants, enums (13 shared DTOs) |

---

## 🏗️ Module Directory Structure (Standard)

Every module follows hexagonal architecture:

```
modules/<module-name>/
├── application/
│   ├── port/
│   │   ├── in/                           # Input ports (use cases)
│   │   │   ├── CreateXUseCase.java
│   │   │   ├── UpdateXUseCase.java
│   │   │   └── QueryXUseCase.java
│   │   └── out/                          # Output ports (contracts)
│   │       ├── XRepositoryPort.java
│   │       └── AuditRepositoryPort.java
│   ├── service/                          # Services (max 5 methods each)
│   │   ├── CreateXService.java           # Implements CreateXUseCase
│   │   ├── UpdateXService.java
│   │   └── QueryXService.java
│   ├── dto/                              # DTOs specific to this module
│   │   ├── CreateXRequest.java
│   │   ├── UpdateXRequest.java
│   │   └── XResponse.java
│   └── exception/                        # Module-specific exceptions (optional)
│       └── XNotFoundException.java
├── domain/
│   ├── X/                                # Main entity + value objects
│   │   ├── X.java
│   │   ├── XStatus.java
│   │   └── XValidator.java
│   ├── exception/                        # Domain exceptions
│   │   ├── InvalidXException.java
│   │   └── XOverlapException.java
│   └── shared/                           # Module constants/enums
│       └── XConstants.java
├── infrastructure/
│   ├── controller/                       # REST endpoints
│   │   ├── XController.java
│   │   └── XControllerAdvice.java        # Error handling (optional)
│   ├── persistence/
│   │   ├── XJpaRepository.java           # Spring Data
│   │   ├── XRepositoryAdapter.java       # Implements XRepositoryPort
│   │   ├── XEntity.java                  # JPA entity
│   │   └── mapper/
│   │       └── XMapper.java              # Entity ↔ Domain mapping
│   ├── event/                            # Event handlers (optional)
│   │   ├── XCreatedEventHandler.java
│   │   └── XPublishedEvent.java
│   └── config/                           # Module config
│       └── XModuleConfig.java
└── test/
    ├── application/
    │   ├── CreateXServiceTest.java
    │   └── UpdateXServiceTest.java
    ├── domain/
    │   ├── XTest.java
    │   └── XValidatorTest.java
    └── infrastructure/
        ├── XControllerTest.java
        └── XRepositoryAdapterTest.java
```

---

## 🔌 Inter-Module Communication

### Rule 1: Use Ports, Not Implementations

**❌ WRONG:**
```java
parking.operation.PricingService pricingService = ...;  // Direct dependency
```

**✅ CORRECT:**
```java
// Module B needs something from Module A
public interface RateQueryPort {
    Optional<Rate> findApplicable(...);
}

// Module A implements the port
@Component
public class RateQueryAdapter implements parking.operation.RateQueryPort { ... }

// Module B injects the port interface
public class PricingService {
    private final parking.operation.RateQueryPort rates;
}
```

### Rule 2: Dependency Direction

```
auth (core, no deps)
  ↓ (auth needed by everything)
all modules depend on auth
  ↓
configuration, audit, licensing (depend only on auth)
  ↓
parking.* (depend on auth, configuration)
  ↓
cash, billing, tickets (depend on auth, configuration, parking.operation)
  ↓
sync, search, reports (depend on multiple sources via ports)
```

**No circular dependencies allowed.**

---

## 📖 Detailed Module Descriptions

### 1. **auth** — Identity & Access Control

**Responsibility:** Authentication, JWT tokens, device authorization, user roles.

**Key Entities:**
- `AppUser` — User account with email, hashed password
- `UserRole` — Role definition (ADMIN, USER, MANAGER)
- `AuthSession` — Active session with JWT + refresh token
- `DeviceAuthorization` — Device fingerprint + approval status

**Input Ports:**
- `LoginUseCase` → `login(email, password, deviceInfo)` → SessionResponse
- `RefreshTokenUseCase` → `refresh(refreshToken)` → SessionResponse
- `DeviceAuthorizationUseCase` → `authorizeDevice(deviceId)` → AuthorizationResponse

**Output Ports:**
- `UserRepositoryPort` — CRUD users
- `DeviceRepositoryPort` — CRUD devices
- `TokenRepositoryPort` — Issue/validate tokens

**Dependencies:** None (core module)

**Example Endpoint:**
```
POST /api/v1/auth/login
  Request: { email, password, deviceId, fingerprint }
  Response: { sessionId, accessToken, refreshToken, expiresIn }
```

---

### 2. **configuration** — Master Data

**Responsibility:** System-wide configuration: rates, sites, payment methods, vehicle types, themes.

**Key Entities:**
- `Rate` — Parking rate with start/end dates, price
- `RoundingMode` — Rounding strategy (up, down, nearest)
- `ParkingSite` — Physical location with name, address
- `MonthlyContract` — Monthly subscription pricing
- `PaymentMethod` — Credit card, cash, mobile wallet
- `VehicleType` — Car, truck, motorcycle, etc.

**Input Ports:**
- `RateManagementUseCase` → create, update, delete rates
- `SiteManagementUseCase` → manage parking sites
- `PaymentMethodManagementUseCase` → configure payment methods
- `VehicleTypeManagementUseCase` → define vehicle types

**Output Ports:**
- `RateRepositoryPort`
- `SiteRepositoryPort`
- `PaymentMethodRepositoryPort`
- `AuditRepositoryPort` (shared, from audit module)

**Dependencies:** auth (for auditing)

**Example Endpoint:**
```
POST /api/v1/configuration/rates
  Request: { companyId, startDate, endDate, pricePerHour, vehicleType }
  Response: RateResponse { id, createdAt, ... }
```

---

### 3. **parking.operation** — Core Operations

**Responsibility:** Entry/exit registration, pricing calculation, receipt generation.

**Key Entities:**
- `ParkingSession` — Vehicle parked, entry/exit times
- `Receipt` — Final payment receipt
- `Payment` — Payment details (method, amount, status)
- `Pricing` — Calculated price breakdown (base, tax, discount)

**Input Ports:**
- `EntryUseCase` → Register vehicle entry
- `ExitUseCase` → Register vehicle exit & charge
- `PricingCalculationUseCase` → Calculate price for session
- `SessionQueryUseCase` → Query active/historical sessions

**Output Ports:**
- `SessionRepositoryPort` — CRUD sessions
- `RateQueryPort` — Get applicable rate (calls configuration module)
- `PricingCalculationPort` — Calculate final price
- `PaymentRepositoryPort` — Record payments

**Dependencies:** auth, configuration

**Example Flow:**
```
1. Vehicle arrives → POST /api/v1/operations/entries
2. Get entry time, check vehicle type
3. Registration stored
4. Vehicle departs → POST /api/v1/operations/exits
5. Calculate price: time × rate + tax - discount
6. Generate receipt
7. Request payment
8. Return Receipt
```

---

### 4. **parking.spaces** — Occupancy Tracking

**Responsibility:** Track available parking spaces, occupancy, capacity.

**Key Entities:**
- `ParkingSpace` — Individual space with location, type
- `SpaceOccupancy` — Current occupancy status
- `Capacity` — Total capacity management

**Input Ports:**
- `ListSpacesUseCase` → Get all spaces with occupancy
- `ResizeCapacityUseCase` → Change active capacity
- `OccupancyQueryUseCase` → Check occupancy for type

**Output Ports:**
- `SpaceRepositoryPort` — CRUD spaces
- `OccupancyRepositoryPort` — Track occupancy (read-heavy)

**Dependencies:** auth, configuration

---

### 5. **parking.locker** — Locker Management

**Responsibility:** Locker assignment, availability, cleanup.

**Key Entities:**
- `Locker` — Physical locker with code
- `LockerAssignment` — Assignment to parked vehicle

**Input Ports:**
- `AssignLockerUseCase`
- `FreeLockerUseCase`

**Dependencies:** auth, parking.spaces

---

### 6. **cash** — Cashier Operations

**Responsibility:** Cash session lifecycle, movement recording, reconciliation.

**Key Entities:**
- `CashSession` — Daily cashier session (open/close)
- `CashMovement` — Money in/out (payment, refund, transfer)
- `CashRegister` — Physical cash register

**Input Ports:**
- `OpenCashSessionUseCase` → Open session with opening balance
- `CloseCashSessionUseCase` → Close session, calculate variance
- `RegisterCashMovementUseCase` → Record deposit/withdrawal
- `CashQueryUseCase` → Query sessions, summaries

**Output Ports:**
- `CashRepositoryPort`
- `AuditRepositoryPort`

**Dependencies:** auth, parking.operation (link payments)

**God Service Alert:** `CashSessionManagementService` (475 lines, 7 methods) — documented in [GOD_SERVICES_ROADMAP.md](GOD_SERVICES_ROADMAP.md), low priority to split.

---

### 7. **billing** — Invoicing

**Responsibility:** Generate invoices from sessions, track revenue.

**Key Entities:**
- `Invoice` — Bill with items, total, payment status
- `InvoiceItem` — Line item (session, amount, tax)
- `PaymentEntry` — Payment record

**Input Ports:**
- `GenerateInvoiceUseCase` → Create invoice from sessions
- `RecordPaymentUseCase` → Mark invoice as paid
- `QueryInvoiceUseCase` → List invoices by date/company

**Output Ports:**
- `InvoiceRepositoryPort`
- `ExternalBillingPort` → Send to accounting system (optional)

**Dependencies:** auth, parking.operation, cash

---

### 8. **tickets** — Print Job Management

**Responsibility:** Queue print jobs, track status, reprint.

**Key Entities:**
- `PrintJob` — Print request (parking ticket, report, label)
- `Ticket` — Physical or digital parking ticket
- `TicketTemplate` — Ticket format definition

**Input Ports:**
- `CreatePrintJobUseCase`
- `ReprintTicketUseCase`

**Dependencies:** auth, parking.operation

---

### 9. **audit** — Centralized Audit Logging

**Responsibility:** Centralized audit trail for all entities.

**Key Entities:**
- `AuditLog` — Single log entry (entity, action, user, timestamp)
- `AuditTrail` — Historical sequence

**Input Ports:**
- `LogAuditEventUseCase` → Log event
- `QueryAuditTrailUseCase` → Query by entity/user/date

**Output Ports:**
- `AuditRepositoryPort`

**Used by:** All 14 modules (via shared AuditRepositoryPort)

**Dependencies:** auth only

---

### 10. **licensing** — License Management

**Responsibility:** License activation, validation, heartbeat checks.

**Key Entities:**
- `License` — License key for company
- `LicenseKey` — Activation key
- `Activation` — Activation record (device, timestamp)

**Input Ports:**
- `ValidateLicenseUseCase` → Check if license valid
- `ActivateLicenseUseCase` → Activate new license
- `HeartbeatUseCase` → Periodic health check

**Output Ports:**
- `LicenseRepositoryPort`
- `CryptographyPort` → Sign/verify licenses (RSA)

**Dependencies:** auth

---

### 11. **customers** — Company Management

**Responsibility:** Multi-tenant company management, subscriptions.

**Key Entities:**
- `Company` — Tenant company
- `Subscription` → Current subscription plan
- `Plan` — Pricing plan

**Dependencies:** auth

---

### 12. **search** — Full-Text Search

**Responsibility:** Search sessions, invoices, tickets across modules.

**Tech:** Elasticsearch (optional, local search via database otherwise)

**Dependencies:** auth, all domain modules (via search ports)

---

### 13. **support** — Customer Support

**Responsibility:** Support ticket workflow.

**Key Entities:**
- `SupportTicket` — Customer issue
- `SupportResponse` — Support response

**Dependencies:** auth, customers

---

### 14. **reports** — Analytics & Reporting

**Responsibility:** Generate reports, exports (PDF, CSV).

**Key Entities:** (Dynamic, no static entities)

**Dependencies:** auth, all domain modules (read-only via query ports)

---

## 📊 Dependency Matrix

```
           auth cfg  ops spa lok csh bil tkt aud lic cst src sup rpt
auth       ✓   ✓    ✓   ✓   ✓   ✓   ✓   ✓   ✓   ✓   ✓   ✓   ✓   ✓
config         ✓    ✓   ✓   ✓   
ops                 ✓   
spaces              
locker          
cash                               
billing                    
tickets                    
audit                                  
licensing              
customers                  
search                                    
support                         
reports                                       

✓ = depends on
(blank) = no dependency
```

**Key Rule:** No circular dependencies. Dependency graph is a DAG.

---

## ✅ Module Completeness Checklist

For each module, verify:

### Structure
- [ ] `application/port/in/` exists with ≥1 input port
- [ ] `application/port/out/` exists with ≥1 output port
- [ ] `application/service/` exists with services (max 5 methods each)
- [ ] `domain/` contains entities + exceptions
- [ ] `infrastructure/controller/` exists with REST endpoints
- [ ] `infrastructure/persistence/` exists with adapters

### Naming
- [ ] Input port interfaces named `<UseCase>UseCase.java`
- [ ] Output port interfaces named `<Repository>RepositoryPort.java` or `<Service>Port.java`
- [ ] Services named `<Feature>Service.java`
- [ ] Controllers named `<Feature>Controller.java`

### No Antipatterns
- [ ] No `service/` directory at module root
- [ ] No `repository/` directory at module root
- [ ] No `presentation/` layer (use `infrastructure/controller/`)
- [ ] No services >5 public methods
- [ ] No facade services
- [ ] No field injection (constructor only)

### Tests
- [ ] Domain tests: unit tests, no mocks
- [ ] Application tests: unit with mocked ports
- [ ] Infrastructure tests: integration with real database

---

## 🔗 See Also

- [api-modules.md](api-modules.md) — Detailed ports table
- [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md) — How to structure a module
- [HEXAGONAL_PORTS.md](HEXAGONAL_PORTS.md) — How to use ports
- [ANTIPATTERNS.md](ANTIPATTERNS.md) — What NOT to do
- [GOD_SERVICES_ROADMAP.md](GOD_SERVICES_ROADMAP.md) — Services to monitor
- [STRUCTURAL_COMPLIANCE_REPORT.md](../STRUCTURAL_COMPLIANCE_REPORT.md) — Current status

---

**Last Updated:** 27 de junio de 2026  
**Compliance:** 17/17 modules hexagonal compliant
