# God Services Refactoring Plan

**Status**: 30 services identified for refactoring (≤5 method rule violation)  
**Priority**: High (Architecture compliance)  
**Effort**: 8-12 hours (1-2 sprints)

---

## Executive Summary

The codebase currently has **30 services exceeding the 5-public-method limit** defined in CLAUDE.md hexagonal architecture standards. This document outlines a decomposition strategy for each service category.

**Key Principle**: Split god services by **business capability**, not just CRUD operations. Each service = 1 input port (use case).

---

## Tier 1: Critical (≥10 methods) — 5 Services

### 1. SettingsVehicleTypeService (13 methods)

**Current**: Mixed master & company-scoped vehicle type operations  
**Split Strategy**:

```
SettingsVehicleTypeService (13 methods)
├── MasterVehicleTypeManagementService (5 methods)
│   ├── listAll()
│   ├── create(VehicleTypeRequest)
│   ├── update(UUID, VehicleTypeRequest)
│   ├── patchStatus(UUID, boolean)
│   └── delete(UUID)
│
├── CompanyVehicleTypeManagementService (6 methods)
│   ├── listByCompany(UUID)
│   ├── addTypeToCompany(UUID, String)
│   ├── updateCompanyType(UUID, VehicleTypeRequest)
│   ├── patchCompanyTypeStatus(UUID, boolean)
│   ├── removeCompanyType(UUID)
│   └── ensureMasterTypeExists(String)
│
└── VehicleTypeMapperService (2 private → internal helpers)
    └── toMasterResponse(), toCompanyResponse(), etc. (keep private)
```

**Ports to create**:
- `MasterVehicleTypeUseCase` (input port)
- `CompanyVehicleTypeUseCase` (input port)
- Both reuse existing `MasterVehicleTypePort` & `CompanyVehicleTypePort` (output ports)

**Decomposition Details**:
| New Service | Methods | Dependencies |
|---|---|---|
| `MasterVehicleTypeManagementService` | 5 | `MasterVehicleTypePort` |
| `CompanyVehicleTypeManagementService` | 6 | `MasterVehicleTypePort`, `CompanyVehicleTypePort` |

---

### 2. ReportQueryService (11 methods)

**Current**: Mixed daily & analytics reporting  
**Split Strategy**:

```
ReportQueryService (11 methods)
├── DailyReportQueryService (5 methods)
│   ├── getDailyRevenue(LocalDate)
│   ├── getDailyOccupancy(LocalDate)
│   ├── getDailyTransactions(LocalDate)
│   ├── getDailyViolations(LocalDate)
│   └── exportDailyReport(LocalDate)
│
└── AnalyticsReportQueryService (6 methods)
    ├── getMonthlyTrends(YearMonth)
    ├── getYearlyMetrics(Year)
    ├── getComparisonMetrics(LocalDate, LocalDate)
    ├── getGrowthAnalysis(Period)
    ├── getAnomalies(Period)
    └── exportAnalyticsReport(Period)
```

**Ports to create**:
- `DailyReportUseCase` (input port)
- `AnalyticsReportUseCase` (input port)
- Reuse existing repository ports

---

### 3. LicenseAuditService (10 methods)

**Current**: License validation + audit trail  
**Split Strategy**:

```
LicenseAuditService (10 methods)
├── LicenseAuditRecorderService (5 methods)
│   ├── recordActivation(UUID, String)
│   ├── recordRevocation(UUID, String)
│   ├── recordViolation(UUID, String)
│   ├── recordUsageEvent(UUID, String)
│   └── recordExport(UUID, String)
│
└── LicenseAuditQueryService (5 methods)
    ├── getAuditTrail(UUID)
    ├── getViolationHistory(UUID)
    ├── getComplianceReport(UUID)
    ├── searchAuditEvents(AuditFilter)
    └── exportAuditLog(UUID)
```

---

### 4. InvoiceService (10 methods)

**Current**: Invoice generation + state mgmt  
**Split Strategy**:

```
InvoiceService (10 methods)
├── InvoiceGenerationService (5 methods)
│   ├── generateInvoice(UUID, Period)
│   ├── generateBatch(UUID[], Period)
│   ├── regenerateInvoice(UUID)
│   ├── calculateTotals(Invoice)
│   └── applyDiscounts(Invoice, DiscountRequest)
│
└── InvoiceStateManagementService (5 methods)
    ├── markAsSent(UUID)
    ├── markAsPaid(UUID, PaymentReference)
    ├── markAsOverdue(UUID)
    ├── cancelInvoice(UUID, String reason)
    └── voidInvoice(UUID, String reason)
```

---

### 5. CompanyManagementService (10 methods)

**Current**: Company lifecycle + settings + queries  
**Split Strategy**:

```
CompanyManagementService (10 methods)
├── CompanyLifecycleService (3 methods)
│   ├── createCompany(CreateCompanyRequest)
│   ├── activateCompany(UUID)
│   └── deactivateCompany(UUID)
│
├── CompanySettingsManagementService (4 methods)
│   ├── updateSettings(UUID, SettingsRequest)
│   ├── updateTheme(UUID, ThemeRequest)
│   ├── updateFeatures(UUID, FeatureToggleRequest)
│   └── resetToDefaults(UUID)
│
└── CompanyQueryService (3 methods)
    ├── getCompany(UUID)
    ├── listCompanies(Pageable)
    └── getSettings(UUID)
```

---

## Tier 2: High (6-9 methods) — 9 Services

| Service | Methods | Suggested Split |
|---|---|---|
| **PrepaidService** | 9 | PackageManagement (5) + BalanceQueries (4) |
| **ParkingSpaceService** | 9 | SpaceManagement (5) + SpaceQueries (4) |
| **OnboardingService** | 9 | OnboardingProgression (5) + OnboardingQueries (4) |
| **PlanService** | 8 | PlanManagement (4) + PlanQueries (4) |
| **OperationalConfigurationService** | 8 | SiteConfiguration (4) + TerminalConfiguration (4) |
| **ThemeConfigurationManagementService** | 7 | ThemeManagement (4) + ThemeQueries (3) |
| **SettingsUserService** | 7 | UserManagement (4) + UserQueries (3) |
| **SettingsRateService** | 7 | RateManagement (4) + RateQueries (3) |
| **TicketService** | 7 | TicketManagement (4) + TicketQueries (3) |

**Action**: Apply same decomposition pattern per CLAUDE.md

---

## Tier 3: Medium (6 methods) — 16 Services

Refactor after Tier 1-2 complete. Most can be split into:
- **Management** service (Create/Update/Delete - 3 methods)
- **Query** service (Read/List - 3 methods)

Examples:
- `PaymentMethodManagementService` → Management (3) + Queries (3)
- `AuditService` → Recorder (3) + Queries (3)
- `MonthlyContractService` → Management (3) + Queries (3)

---

## Refactoring Checklist

### For Each Service to Split

**Step 1: Identify boundaries** (existing comments help)
- Look for method groups (CRUD, queries, integrations)
- Check constructor dependencies - separate concerns should need different ports

**Step 2: Create new services**
- Extract methods to new service class
- Keep shared helpers in private methods or internal mapper class
- Reuse existing output ports (repositories, domain ports)

**Step 3: Create/update input ports**
- Create `*UseCase` interface per new service
- Ensure each port ≤5 methods
- Old service implements new ports (for compatibility)

**Step 4: Update controllers**
- Inject new service ports instead of monolithic service
- No change to endpoint logic (transparent to HTTP layer)

**Step 5: Mark old service @Deprecated**
```java
@Deprecated(since = "2.0", forRemoval = true, 
    message = "Use MasterVehicleTypeManagementService & CompanyVehicleTypeManagementService")
public class SettingsVehicleTypeService { ... }
```

**Step 6: Test**
- No behavior change (unit tests should pass unchanged)
- Integration tests verify endpoints still work

---

## Example: SettingsVehicleTypeService Refactoring

### File 1: MasterVehicleTypeManagementService.java

```java
package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.settings.application.port.in.MasterVehicleTypeUseCase;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.StandardVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import com.parkflow.modules.common.exception.OperationException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static com.parkflow.config.CacheConfig.VEHICLE_TYPES_ALL;

@Service
public class MasterVehicleTypeManagementService implements MasterVehicleTypeUseCase {
    private final MasterVehicleTypePort repository;
    private final VehicleTypeMapperService mapper;

    public MasterVehicleTypeManagementService(MasterVehicleTypePort repository,
                                               VehicleTypeMapperService mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Cacheable(VEHICLE_TYPES_ALL)
    @Transactional(readOnly = true)
    public List<VehicleTypeResponse> listAll() {
        return repository.findAllByOrderByDisplayOrderAscNameAsc().stream()
            .map(mapper::toMasterResponse)
            .toList();
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    public VehicleTypeResponse create(VehicleTypeRequest req) {
        // implementation...
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    public VehicleTypeResponse update(UUID id, VehicleTypeRequest req) {
        // implementation...
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    public void patchStatus(UUID id, boolean active) {
        // implementation...
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    public void delete(UUID id) {
        // implementation...
    }
}
```

### File 2: MasterVehicleTypeUseCase.java (new port)

```java
package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import java.util.List;
import java.util.UUID;

public interface MasterVehicleTypeUseCase {
    List<VehicleTypeResponse> listAll();
    VehicleTypeResponse create(VehicleTypeRequest request);
    VehicleTypeResponse update(UUID id, VehicleTypeRequest request);
    void patchStatus(UUID id, boolean active);
    void delete(UUID id);
}
```

### File 3: CompanyVehicleTypeManagementService.java

```java
// Similar structure - implements CompanyVehicleTypeUseCase
// 6 methods: listByCompany, addTypeToCompany, updateCompanyType, 
//            patchCompanyTypeStatus, removeCompanyType, ensureMasterTypeExists
```

### File 4: VehicleTypeMapperService.java

Extract common mappers into internal service (shared by both):

```java
package com.parkflow.modules.settings.application.service;

@Service
class VehicleTypeMapperService {
    public VehicleTypeResponse toMasterResponse(MasterVehicleType type) { ... }
    public VehicleTypeResponse toCompanyResponse(CompanyVehicleType cvType) { ... }
    // ... other helpers
}
```

### File 5: Update Controller

```java
@RestController
@RequestMapping("/api/v1/configuration/vehicle-types")
public class VehicleTypeController {
    // Inject both new services + mapper
    private final MasterVehicleTypeUseCase masterService;
    private final CompanyVehicleTypeUseCase companyService;
    
    // Endpoints use appropriate service (no change to logic)
}
```

### File 6: Mark Original @Deprecated

```java
@Deprecated(since = "2.0", forRemoval = true,
    message = "Use MasterVehicleTypeManagementService & CompanyVehicleTypeManagementService")
@Service
public class SettingsVehicleTypeService implements VehicleTypeUseCase {
    // Provide delegation methods to new services for backwards compatibility
    public List<VehicleTypeResponse> listAll() {
        return masterService.listAll();
    }
    // ... etc
}
```

---

## Migration Timeline

### Week 1: Tier 1 (5 services)
- SettingsVehicleTypeService (2 services + mapper)
- ReportQueryService (2 services)
- LicenseAuditService (2 services)
- InvoiceService (2 services)
- CompanyManagementService (3 services)
- **Effort**: 8-10 hours
- **Build verification**: `gradle build -x test` → SUCCESS

### Week 2: Tier 2 (9 services)
- PrepaidService → 2 services
- ParkingSpaceService → 2 services
- OnboardingService → 2 services
- PlanService → 2 services
- OperationalConfigurationService → 2 services
- **Effort**: 6-8 hours

### Week 3+: Tier 3 (16 services)
- Batch refactor by pattern
- **Effort**: 4-6 hours

---

## Validation Checklist

After refactoring each service:

- [ ] Build succeeds: `./gradlew clean build -x test`
- [ ] No new violations: `find . -name "*.java" | xargs grep "public " | wc -l` (per service)
- [ ] Import statements updated across all files
- [ ] Old service marked `@Deprecated` with migration path
- [ ] New input port interfaces created
- [ ] Controllers inject new services
- [ ] No behavior change to endpoints
- [ ] Test coverage maintained
- [ ] Code review approved

---

## Notes

1. **Shared Helpers**: Extract to internal `*MapperService` or `*HelperService` classes (not public input ports)
2. **Transaction Boundaries**: Each service manages its own `@Transactional` scope
3. **Caching**: Preserve cache decorators on appropriate methods
4. **Deprecation**: Keep old service for 2 sprints, then remove
5. **Controllers**: Update to inject new ports, not old monolithic service

---

**Last Updated**: 2026-06-25  
**Author**: Claude Code  
**Status**: Ready for implementation
