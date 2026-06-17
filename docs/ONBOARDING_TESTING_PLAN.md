# Onboarding Module - Testing Plan

**Module**: `/apps/api/src/main/java/com/parkflow/modules/onboarding`  
**Status**: ✅ Unit test structure created  
**Coverage Goal**: 80%+  
**Date**: 2026-06-16

---

## Module Structure Overview

The onboarding module is divided into:

```
onboarding/
├── application/
│   ├── port/
│   │   └── in/OnboardingUseCase.java (Interface)
│   └── service/ (Implementation layer)
│       ├── OnboardingService.java (Core service)
│       ├── CompanySettingsService.java (Settings management)
│       ├── FeatureAccessService.java (License-based access)
│       ├── OnboardingQuestionConfigService.java (Question management)
│       └── Mapper classes (Data transformation)
├── domain/ (Business logic entities)
│   ├── OnboardingProgress.java
│   ├── CompanySettings.java
│   ├── CompanySettingsSnapshot.java
│   └── OnboardingQuestionConfig.java
├── infrastructure/
│   └── persistence/ (Repository adapters)
│       ├── OnboardingProgressJpaAdapter.java
│       ├── CompanySettingsJpaAdapter.java
│       └── CompanySettingsSnapshotJpaAdapter.java
├── presentation/
│   └── controllers/ (REST endpoints)
│       ├── OnboardingController.java
│       └── AdminOnboardingController.java
└── dto/ (Data Transfer Objects)
    ├── OnboardingStatusResponse.java
    ├── SaveOnboardingStepRequest.java
    └── CompanyCapabilitiesResponse.java
```

---

## Testing Strategy

### Layer 1: Unit Tests (Service Layer)

**Goal**: Test business logic in isolation with mocked dependencies

**Components to Test**:

#### 1. OnboardingService
- **Methods to test**:
  - `saveOnboardingStep(UUID, int, Map, Integer)` - Save progress at each step
  - `completeOnboarding(UUID)` - Mark onboarding as complete
  - `resetOnboarding(UUID, String)` - Reset to beginning
  - `getOnboardingStatus(UUID)` - Get current progress
  - `createRatesFromOnboarding()` - Create rate entities from onboarding
  - `createLockers()` - Create locker entities if helmet mode = LOCKERS

**Test Scenarios**:
- ✓ Save step with valid data
- ✓ Save multiple steps in sequence
- ✓ Reject invalid step numbers (0, negative, > 12)
- ✓ Reject step out of sequence (skip from 1 to 5)
- ✓ Complete onboarding when at step 12
- ✓ Reset onboarding (go back to step 1)
- ✓ Create rates with correct structure
- ✓ Create lockers with correct count
- ✓ Handle null/empty company
- ✓ Handle concurrent saves

**File**: `OnboardingServiceUnitTest.java`

---

#### 2. CompanySettingsService
- **Methods to test**:
  - `getSettingsOrDefault(Company)` - Retrieve or default settings
  - `upsertSettings(Company, Map)` - Create or update settings
  - `createSnapshot(UUID)` - Create backup snapshot

**Test Scenarios**:
- ✓ Retrieve existing settings
- ✓ Return defaults when not found
- ✓ Merge new settings with existing ones
- ✓ Update partial settings without loss
- ✓ Handle large settings JSON (1000+ fields)
- ✓ Persist settings to database
- ✓ Create snapshot on completion

**File**: `CompanySettingsServiceUnitTest.java`

---

#### 3. FeatureAccessService
- **Methods to test**:
  - `canAccessFeature(UUID, String)` - Check if feature is allowed
  - `getAvailableFeatures(UUID)` - List all available features
  - `invalidateCache(UUID)` - Clear caching

**Test Scenarios**:
- ✓ SYNC plan allows basic features (parking, rates)
- ✓ SYNC plan denies advanced features (clients, audit)
- ✓ PRO plan allows most features
- ✓ PRO plan denies enterprise features (multi-location)
- ✓ ENTERPRISE plan allows all features
- ✓ Unknown features return false (safe default)
- ✓ Caching works (single DB query for multiple checks)
- ✓ Cache invalidation clears cache

**File**: `FeatureAccessServiceUnitTest.java`

---

#### 4. OnboardingQuestionConfigService
- **Methods to test**:
  - `getQuestionConfig(int)` - Get question for step
  - `validateAnswer()` - Validate user answer
  - `getNextQuestion()` - Calculate next step

**Test Scenarios**:
- ✓ Retrieve question config for each step 1-12
- ✓ Return correct validation rules
- ✓ Calculate correct next step
- ✓ Handle conditional questions

**File**: `OnboardingQuestionConfigServiceUnitTest.java`

---

### Layer 2: Mapper Tests

**Goal**: Ensure data transformation is correct and no data is lost

#### OnboardingSettingsMapper
- Map step 1 (Vehicle Types) → settings
- Map step 2 (Capacity) → settings
- Map step 3 (Rates) → settings
- Map step 5 (Region) → settings
- Preserve nested objects
- Validate data types

**File**: `OnboardingSettingsMapperTest.java`

---

### Layer 3: Integration Tests

**Goal**: Test service + repository interaction

#### OnboardingServiceIntegrationTest
- @SpringBootTest with real database (H2 test DB)
- Test full onboarding flow: Step 1 → Step 12 → Complete
- Verify database state after each step
- Test rollback on error
- Test concurrent users

**File**: `OnboardingServiceIntegrationTest.java`

---

### Layer 4: Controller Tests

**Goal**: Test REST endpoints + authentication + validation

#### OnboardingControllerTest
- Test GET /onboarding/status - requires ADMIN or OPERADOR role
- Test POST /onboarding/step - requires ADMIN role (write)
- Test POST /onboarding/complete - requires ADMIN role
- Test POST /onboarding/reset - requires ADMIN role
- Test 401 Unauthorized when no token
- Test 403 Forbidden for read-only roles on write endpoints
- Test 400 Bad Request for invalid step data
- Test 404 Not Found for non-existent company

**File**: `OnboardingControllerTest.java`

---

## Test Coverage Goals

| Component | Unit Tests | Integration | E2E | Coverage Goal |
|-----------|-----------|-------------|-----|---------------|
| OnboardingService | ✓ | Planned | | 85%+ |
| CompanySettingsService | ✓ | Planned | | 85%+ |
| FeatureAccessService | ✓ | Planned | | 90%+ |
| OnboardingQuestionConfigService | ✓ | Planned | | 80%+ |
| Mappers | ✓ | | | 90%+ |
| Controllers | ✓ | | | 80%+ |
| Domain Entities | ✓ | | | 70%+ |
| **Overall Module** | | | | **80%+** |

---

## Test Execution Order

1. **Run unit tests** (fastest, no DB)
   ```bash
   ./gradlew :test --tests "*Onboarding*ServiceUnitTest"
   ```

2. **Run integration tests** (slower, uses H2 DB)
   ```bash
   ./gradlew :test --tests "*Onboarding*IntegrationTest"
   ```

3. **Run all onboarding tests**
   ```bash
   ./gradlew :test --tests "*Onboarding*Test"
   ```

4. **Check coverage**
   ```bash
   ./gradlew jacocoTestReport
   # View: build/reports/jacoco/test/html/index.html
   ```

---

## Data Flow to Test

```
User Input (Step 1-12)
    ↓
OnboardingController.saveStep()
    ↓
OnboardingService.saveOnboardingStep()
    ├─ Validate input
    ├─ Update OnboardingProgress
    ├─ Persist settings via CompanySettingsService
    └─ Return status
    ↓
CompanySettingsService.upsertSettings()
    ├─ Merge with existing settings
    └─ Persist to DB
    ↓
Test: Verify DB state
Test: Verify response
```

---

## Test Data Setup

Each test should create:
- Company (UUID, name, plan)
- OnboardingProgress (step 1, not completed)
- Empty CompanySettings (for merging)

**Mock Objects**:
- CompanyPort (repository)
- OnboardingProgressPort (repository)
- CompanySettingsService
- FeatureAccessService

---

## Current Test Files Created

✓ `/apps/api/src/test/java/com/parkflow/modules/onboarding/application/service/OnboardingServiceUnitTest.java`
- 4 test cases (in progress)
- Tests: save step, multiple steps, complete, reset

---

## Test Files to Create

```
[ ] OnboardingServiceIntegrationTest.java (15-20 tests)
[ ] CompanySettingsServiceUnitTest.java (12-15 tests)
[ ] FeatureAccessServiceUnitTest.java (14-18 tests)
[ ] OnboardingQuestionConfigServiceUnitTest.java (10-12 tests)
[ ] OnboardingSettingsMapperTest.java (8-10 tests)
[ ] OnboardingControllerTest.java (12-15 tests)
[ ] OnboardingProgressTest.java (8-10 tests)
[ ] CompanySettingsTest.java (6-8 tests)
[ ] AdminOnboardingControllerTest.java (8-10 tests)
```

**Total: 110-140 tests planned**

---

## Known Testing Challenges

1. **Complex mocking**: OnboardingService depends on 5+ services
   - **Solution**: Use @MockBean for dependencies, focus on happy path first

2. **Database state**: Tests must set up correct state for each step
   - **Solution**: Use @BeforeEach setUp() with standard test data

3. **Concurrent testing**: Hard to test without integration DB
   - **Solution**: Defer to integration tests

4. **Legacy code**: Some methods might not have clear contracts
   - **Solution**: Test actual behavior, not intended behavior

---

## Quick Start

To create a new test file:

```java
@ExtendWith(MockitoExtension.class)
@DisplayName("ClassName Unit Tests")
class ClassNameTest {
  @Mock private Dependency dep;
  @InjectMocks private ClassUnderTest service;

  private TestData testData;

  @BeforeEach
  void setUp() {
    testData = new TestData();
  }

  @Test
  @DisplayName("Should...")
  void test_shouldDoSomething() {
    // Arrange
    when(dep.method()).thenReturn(value);
    
    // Act
    var result = service.method();
    
    // Assert
    assertEquals(expected, result);
    verify(dep).method();
  }
}
```

---

## Success Criteria

✅ All test classes compile  
✅ Unit tests run without errors  
✅ 80%+ code coverage  
✅ All feature branches covered  
✅ Edge cases tested  
✅ Documentation complete  

---

**Prepared by**: Claude Code  
**Date**: 2026-06-16  
**Status**: Test structure created, implementation in progress
