# God Services Refactoring Strategy

## Problem
18 services exceed 5 public methods, violating hexagonal architecture.

## Solution
Split each service into focused services with clear responsibility boundaries.

## Pattern: Query vs Management Split

Most services separate into:
1. **QueryService / ReadService** - Read-only operations (get, list, find, search, aggregate)
2. **ManagementService / LifecycleService** - Mutations (create, update, delete, activate, etc.)

## Tier 1 - Critical (9 services)

### 1. SettingsVehicleTypeService (11 → 2)
**Current**: listAll, create, update, patchStatus, delete, listByCompany, addTypeToCompany, updateCompanyType, patchCompanyTypeStatus, removeCompanyType, ensureMasterTypeExists

**Split**:
- `MasterVehicleTypeManagementService` (5): create, update, patchStatus, delete, ensureMasterTypeExists
- `CompanyVehicleTypeManagementService` (5): addTypeToCompany, updateCompanyType, patchCompanyTypeStatus, removeCompanyType, listByCompany (query)

**Ports**:
- Create `MasterVehicleTypeManagementUseCase`
- Create `CompanyVehicleTypeManagementUseCase` (includes listByCompany which is company-scoped)

---

### 2. ReportQueryService (10 → 2)
**Current**: dailyOperations, cashSessionHistory, cashSessionSummary, vehicleTypeSnapshot, paidTickets, voidedTickets, incomeExpense, occupancy, byOperator, byPaymentMethod

**Split**:
- `DailyReportsQueryService` (5): dailyOperations, paidTickets, voidedTickets, incomeExpense, byPaymentMethod
- `CashReportsQueryService` (5): cashSessionHistory, cashSessionSummary, vehicleTypeSnapshot, occupancy, byOperator

---

### 3. LicenseAuditService (9 → 2)
**Current**: recordLicenseCreation, recordLicenseActivation, recordLicenseRenewal, recordLicenseDowngrade, recordLicenseExpiration, queryLog, generateReport, searchByCompany, exportAuditTrail

**Split**:
- `AuditRecorderService` (5): recordLicenseCreation, recordLicenseActivation, recordLicenseRenewal, recordLicenseDowngrade, recordLicenseExpiration
- `AuditQueryService` (4): queryLog, generateReport, searchByCompany, exportAuditTrail

---

### 4. CompanyManagementService (9 → 3)
**Current**: createCompany, getCompany, listAllCompanies, listAllCompaniesPaginated, searchCompanies, updateCompany, activateCompany, deactivateCompany, purgeCompany

**Split**:
- `CompanyLifecycleService` (5): createCompany, activateCompany, deactivateCompany, purgeCompany, updateCompany
- `CompanyQueryService` (4): getCompany, listAllCompanies, listAllCompaniesPaginated, searchCompanies

---

### 5. ParkingSpaceService (8 → 2)
**Current**: createSpace, updateSpace, resizeCapacity, deleteSpace, validateSpace, getSpace, listSpaces, searchSpaces

**Split**:
- `SpaceManagementService` (4): createSpace, updateSpace, resizeCapacity, deleteSpace
- `SpaceQueryService` (4): getSpace, listSpaces, searchSpaces, validateSpace (validation is query)

---

### 6. PrepaidService (8 → 2)
**Current**: create, createBulk, validate, activate, list, search, getBalance, export

**Split**:
- `PrepaidManagementService` (4): create, createBulk, validate, activate
- `PrepaidQueryService` (4): list, search, getBalance, export

---

### 7. OnboardingService (7 → 2)
**Current**: status, saveStep, skip, complete, reset, isFeatureEnabled, getSettings

**Split**:
- `OnboardingProgressService` (4): status, saveStep, skip, complete
- `OnboardingQueryService` (3): reset, isFeatureEnabled, getSettings

---

### 8. PlanService (7 → 2)
**Current**: create, activate, deactivate, renew, get, list, search

**Split**:
- `PlanLifecycleService` (4): create, activate, deactivate, renew
- `PlanQueryService` (3): get, list, search

---

### 9. InvoiceService (7 → 2)
**Current**: generate, bulk, create, recalculate, get, list, search

**Split**:
- `InvoiceGenerationService` (4): generate, bulk, create, recalculate
- `InvoiceQueryService` (3): get, list, search

---

## Tier 2 - Borderline (9 services with 6 methods each)

These need analysis for split feasibility.

