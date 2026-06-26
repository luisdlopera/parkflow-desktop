# ADR-0006: API Module Consolidation Strategy

**Status**: Accepted  
**Date**: 2026-06-25  
**Version**: 1.0  

---

## Context

Backend modules grew organically with 13 modules (configuration, parking, licensing, cash, billing, sync, search, onboarding, audit, auth, customers, devices, reports) totaling:

- 207 services/use cases
- 49 controllers
- 111 ports
- 13 distinct domain models

### Problems

- **Scattered DTOs**: Same request/response objects defined in 3+ places
- **Duplicate Logic**: Rate validation logic in `RateService` and `RateCalculationService`
- **Weak Typing**: `String` used for company_id; easy to pass wrong value
- **Missing Contracts**: Some modules had no input/output ports (tight coupling)

---

## Decision

**Consolidate DTOs to `/common/dto/`, establish canonical port contracts, and enforce module boundaries.**

### Structure

```
modules/
├── common/
│   ├── dto/                        # Shared DTOs for ALL modules
│   │   ├── request/
│   │   │   ├── CreateRateRequest.java
│   │   │   ├── CreateUserRequest.java
│   │   │   └── ...
│   │   ├── response/
│   │   │   ├── RateResponse.java
│   │   │   ├── UserResponse.java
│   │   │   └── ...
│   │   └── mapper/
│   │       ├── RateMapper.java
│   │       ├── UserMapper.java
│   │       └── ...
│   ├── domain/
│   │   ├── type/                   # Shared value objects (CompanyId, UserId, etc.)
│   │   ├── exception/
│   │   └── shared/
│   └── port/                       # Cross-module contracts
│       ├── in/
│       │   ├── AuditLogPortIn.java
│       │   └── NotificationPortIn.java
│       └── out/
│           ├── AuditServicePortOut.java
│           └── NotificationServicePortOut.java
│
├── configuration/
│   ├── domain/                     # No DTOs here (use /common/dto/)
│   │   ├── rate/
│   │   ├── user/
│   │   └── vehicle/
│   ├── application/usecase/
│   └── infrastructure/
│
├── parking/
│   ├── domain/
│   │   ├── operation/
│   │   ├── locker/
│   │   └── spaces/
│   ├── application/usecase/
│   └── infrastructure/
│
└── ... (other modules, same structure)
```

### DTO Consolidation Example

#### Before: Scattered DTOs
```
modules/configuration/dto/CreateRateRequest.java     ❌ Module-specific
modules/parking/dto/CreateRateRequest.java            ❌ Different object!
modules/billing/dto/RateResponse.java                 ❌ Another variation
```

#### After: Single Source of Truth
```
modules/common/dto/request/CreateRateRequest.java     ✅ Canonical
modules/common/dto/response/RateResponse.java         ✅ Single definition
modules/common/dto/mapper/RateMapper.java             ✅ Centralized mapping
```

---

## Consequences

✅ **Clarity**: One way to create a rate, no ambiguity  
✅ **Reusability**: Services across modules share same DTOs  
✅ **Testability**: Mock objects consistent across all tests  
✅ **API Documentation**: Swagger shows single RateResponse object (not 3 variants)  

❌ **Coupling**: Modules more tightly coupled via /common (mitigated by careful DTO design)  
❌ **Shared Ownership**: DTO changes affect all modules (require coordinated updates)

---

## Implementation Rules

1. **Never duplicate a DTO**: If it exists in `/common/dto/`, use it everywhere
2. **DTO scope**: Request/response objects only; entities stay in module domains
3. **Mapper pattern**: Each DTO family has corresponding Mapper
4. **Version compatibility**: Add new DTO if old one becomes incompatible (don't modify)

---

## Related ADRs

- [ADR-0001: Hexagonal Architecture](0001-hexagonal-architecture.md) — Common ports live in /common/port/

---

**Last Updated**: 2026-06-25  
**Status**: ✅ Implemented (phase 3.2 complete)  
**Coverage**: 13 DTOs consolidated to /common/dto/
