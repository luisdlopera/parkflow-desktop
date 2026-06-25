# Migration Guide: Deprecated Configuration Services

**Applies to**: Configuration API consumers  
**Deprecated Since**: 2026-06-25  
**Removal Timeline**: 2.0 (TBD)  
**Replacement**: `SettingsManagementFacadeService`

---

## Overview

Six configuration services have been consolidated into a unified `SettingsManagementFacadeService`. This guide helps you migrate from deprecated services to the new facade.

**Deprecated Services**:
1. `CapacityManagementService`
2. `ModuleConfigurationService`
3. `FeatureConfigurationService`
4. `ShiftConfigurationService`
5. `RegionConfigurationService`
6. `HelmetHandlingService`

---

## Migration Steps

### Step 1: Identify Your Usage

Find which deprecated services your code uses:

```bash
# Search your codebase
grep -r "CapacityManagementService\|ModuleConfigurationService\|FeatureConfigurationService" src/
```

### Step 2: Update Dependencies

Instead of injecting individual services:

**BEFORE** ❌
```java
@Service
public class MyConfigService {
  private final CapacityManagementService capacityService;
  private final ModuleConfigurationService moduleService;
  private final FeatureConfigurationService featureService;
  
  // Constructor injection
  public MyConfigService(
    CapacityManagementService capacityService,
    ModuleConfigurationService moduleService,
    FeatureConfigurationService featureService
  ) { ... }
}
```

**AFTER** ✅
```java
@Service
public class MyConfigService {
  private final SettingsManagementFacadeService settingsService;
  
  // Constructor injection
  public MyConfigService(SettingsManagementFacadeService settingsService) { ... }
}
```

### Step 3: Update Method Calls

Map old service calls to facade methods:

#### Capacity Management

**BEFORE** ❌
```java
CapacityResponse capacity = capacityService.getCapacity(company);
capacityService.updateCapacity(company, request);
```

**AFTER** ✅
```java
Map<String, Object> capacity = settingsService.getCapacity(company);
settingsService.updateCapacity(company, capacityConfig);
```

#### Module Configuration

**BEFORE** ❌
```java
ModuleConfigurationResponse modules = moduleService.getModules(company);
moduleService.updateModules(company, request);
```

**AFTER** ✅
```java
Map<String, Object> modules = settingsService.getModules(company);
settingsService.updateModules(company, moduleConfig);
```

#### Feature Configuration

**BEFORE** ❌
```java
FeatureConfigurationResponse features = featureService.getFeatures(company);
featureService.updateFeatures(company, request);
```

**AFTER** ✅
```java
Map<String, Object> features = settingsService.getFeatures(company);
settingsService.updateFeatures(company, featureConfig);
```

#### Shift Configuration

**BEFORE** ❌
```java
ShiftConfigurationResponse shifts = shiftService.getShifts(company);
shiftService.updateShifts(company, request);
```

**AFTER** ✅
```java
Map<String, Object> shifts = settingsService.getShifts(company);
settingsService.updateShifts(company, shiftConfig);
```

#### Region Configuration

**BEFORE** ❌
```java
RegionConfigurationResponse region = regionService.getRegion(company);
regionService.updateRegion(company, request);
```

**AFTER** ✅
```java
Map<String, Object> region = settingsService.getRegion(company);
settingsService.updateRegion(company, regionConfig);
```

#### Helmet Handling

**BEFORE** ❌
```java
HelmetHandlingResponse helmet = helmetService.getHelmetHandling(company);
helmetService.updateHelmetHandling(company, request);
```

**AFTER** ✅
```java
Map<String, Object> helmet = settingsService.getHelmetHandling(company);
settingsService.updateHelmetHandling(company, helmetConfig);
```

---

## Facade API Reference

### Methods Available

```java
// Capacity
Map<String, Object> getCapacity(Company company);
void updateCapacity(Company company, Map<String, Object> config);

// Modules
Map<String, Object> getModules(Company company);
void updateModules(Company company, Map<String, Object> config);

// Features
Map<String, Object> getFeatures(Company company);
void updateFeatures(Company company, Map<String, Object> config);

// Shifts
Map<String, Object> getShifts(Company company);
void updateShifts(Company company, Map<String, Object> config);

// Region
Map<String, Object> getRegion(Company company);
void updateRegion(Company company, Map<String, Object> config);

// Helmet Handling
Map<String, Object> getHelmetHandling(Company company);
void updateHelmetHandling(Company company, Map<String, Object> config);

// Bulk Operations
void updateAllSettings(Company company, Map<String, Object> allSettings);
```

---

## API Endpoints

**NOTE**: REST endpoints remain unchanged for backward compatibility. The following endpoints still work:

```
GET    /api/v1/configuration/capacity
PATCH  /api/v1/configuration/capacity
GET    /api/v1/configuration/modules
PATCH  /api/v1/configuration/modules
GET    /api/v1/configuration/features
PATCH  /api/v1/configuration/features
GET    /api/v1/configuration/shifts
PATCH  /api/v1/configuration/shifts
GET    /api/v1/configuration/region
PATCH  /api/v1/configuration/region
GET    /api/v1/configuration/helmet-handling
PATCH  /api/v1/configuration/helmet-handling
```

**These endpoints route through the new facade internally**, so no client-side HTTP changes are needed.

---

## Timeline

### Now (June 2026)
- ✅ New facade available alongside deprecated services
- ✅ Endpoints route through facade
- Update your code to use facade

### Next Sprint (July 2026)
- Add warnings to deprecated services
- Add deprecation headers to REST endpoints
- Update client SDKs

### Sprint N+2 (August 2026)
- Remove deprecated services
- Clients MUST have migrated

---

## Testing Your Migration

### Unit Tests

```java
@Test
void testFacadeCapacity() {
  Company company = createTestCompany();
  
  // Old way (deprecated)
  // capacityService.updateCapacity(company, request);
  
  // New way
  Map<String, Object> capacityConfig = Map.of(
    "total", 100,
    "controlSlots", false
  );
  settingsService.updateCapacity(company, capacityConfig);
  
  Map<String, Object> result = settingsService.getCapacity(company);
  assertEquals(100, result.get("total"));
}
```

### Integration Tests

```java
@Test
void testFacadeBulkUpdate() {
  Company company = createTestCompany();
  
  Map<String, Object> allSettings = Map.of(
    "capacity", Map.of("total", 50),
    "modules", Map.of("cash", true),
    "features", Map.of("helmetControl", true)
  );
  
  settingsService.updateAllSettings(company, allSettings);
  
  // Verify all settings updated
  assertNotNull(settingsService.getCapacity(company));
  assertNotNull(settingsService.getModules(company));
  assertNotNull(settingsService.getFeatures(company));
}
```

---

## Troubleshooting

### Issue: "CompilerError: Cannot find symbol CapacityManagementService"

**Solution**: 
1. Remove import of deprecated service
2. Inject `SettingsManagementFacadeService` instead
3. Update method calls per this guide

### Issue: "ResponseType mismatch - expected CapacityResponse, got Map"

**Solution**: 
- Deprecated services returned typed DTOs (CapacityResponse)
- Facade returns `Map<String, Object>`
- Extract values from map: `(Integer) map.get("total")`

### Issue: "Method not found on facade"

**Solution**: 
- Check method names - they match old service names
- Verify parameters - configs are `Map<String, Object>`
- See API Reference above

---

## Support

**Questions?** Contact the Platform Team or check:
- Full Plan: `/.claude/plans/act-a-como-un-qa-curried-frost.md`
- Architectural Decision Record: `/docs/ADR_ONBOARDING_REFACTOR.md`

---

**Last Updated**: 2026-06-25  
**Version**: 1.0
