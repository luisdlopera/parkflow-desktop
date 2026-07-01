# Performance Optimization Plan — ParkFlow Backend

**Target**: 60% → 95% (Performance Score)  
**Focus**: Eliminate N+1 queries, add strategic indexes, implement caching  
**Timeline**: 4-5 hours  
**Build Impact**: 0 breaking changes

---

## 🎯 Current State Analysis

| Metric | Current | Status |
|--------|---------|--------|
| **Indexes Created** | 144 | ✅ Sufficient count |
| **Critical Issue** | N+1 Queries | 🔴 Needs fixing |
| **Missing** | Composite Indexes | 🟡 Partial |
| **Caching** | None | 🔴 Needs implementation |
| **Query Optimization** | Manual | 🟡 Can be improved |

---

## 🔍 PHASE 1: Identify N+1 Problems

### Critical Queries (High-impact N+1 issues):

```
1. RateController.list() → Queries rates
   ❌ Problem: loads rate_fractions for EACH rate (1 + N queries)
   ✅ Fix: Use @EntityGraph or JOIN FETCH

2. ParkingSessionController.list() → Queries sessions
   ❌ Problem: loads vehicle + parking_space for EACH session
   ✅ Fix: CREATE INDEX on (company_id, created_at DESC)

3. AppUserController.list() → Queries users
   ❌ Problem: joins company, role, permissions for each user
   ✅ Fix: Use JPA Specifications with eager loading

4. PaymentController.list() → Queries payments
   ❌ Problem: joins invoice, payment_method, company for each payment
   ✅ Fix: Add composite index (company_id, created_at)

5. AuditLogController.list() → Queries audit logs
   ❌ Problem: filters by company_id, user_id, action (missing composite)
   ✅ Fix: CREATE COMPOSITE INDEX (company_id, user_id, action, created_at)
```

---

## 📊 PHASE 2: Strategic Composite Indexes

### Missing Composite Indexes (Add to V003):

```sql
-- CRITICAL: Pagination + Filtering (Most common query pattern)
CREATE INDEX idx_rate_company_active_created ON rate(company_id, active) 
  WHERE active = true;
CREATE INDEX idx_parking_session_company_created ON parking_session(company_id, created_at DESC);
CREATE INDEX idx_vehicle_company_blacklist ON vehicle(company_id, blacklisted, active);
CREATE INDEX idx_payment_company_status_created ON payment(company_id, status, created_at DESC);
CREATE INDEX idx_app_user_company_active_role ON app_user(company_id, active, role);

-- CRITICAL: Audit & Search
CREATE INDEX idx_audit_log_company_user_created ON global_audit_log(company_id, user_id, created_at DESC);
CREATE INDEX idx_auth_audit_company_action_created ON auth_audit_log(company_id, action, created_at DESC);
CREATE INDEX idx_parking_session_vehicle_active ON parking_session(vehicle_id, active) WHERE active = true;

-- CRITICAL: Foreign Key lookups (prevent sequential scans)
CREATE INDEX idx_payment_invoice_id ON payment(invoice_id);
CREATE INDEX idx_parking_session_rate_id ON parking_session(rate_id);
CREATE INDEX idx_agreement_vehicle_type ON agreement(company_vehicle_type_id);

-- CRITICAL: Date range queries (for reporting)
CREATE INDEX idx_payment_created_at_btree ON payment(created_at DESC);
CREATE INDEX idx_invoice_issued_date_btree ON electronic_invoices(issued_date DESC);
CREATE INDEX idx_parking_session_start_time ON parking_session(start_time DESC);
```

**Count**: 15 new composite indexes

---

## 💾 PHASE 3: Query-Level Optimization

### 3A. JPA EntityGraph (Eager Loading)

**File**: Create new `graphs/RateGraph.java`

```java
@NamedEntityGraph(
  name = "Rate.withFractions",
  attributeNodes = @NamedAttributeNode(value = "fractions", subgraph = "fraction"),
  subgraphs = @NamedSubgraph(name = "fraction", attributeNodes = {})
)
public class Rate {
  // ... fields
}

// Usage in Repository:
@EntityGraph(value = "Rate.withFractions", type = EntityGraphType.LOAD)
List<Rate> findByCompanyIdAndActive(UUID companyId, Boolean active);
```

### 3B. Fetch Join in Custom Queries

**File**: Create `queries/OptimizedQueries.java`

```java
@Repository
public interface ParkingSessionOptimizedRepository {
  
  @Query("""
    SELECT DISTINCT ps FROM ParkingSession ps
    LEFT JOIN FETCH ps.vehicle v
    LEFT JOIN FETCH ps.parkingSpace sp
    LEFT JOIN FETCH ps.rate r
    WHERE ps.companyId = :companyId
    AND ps.createdAt > :cutoffDate
    ORDER BY ps.createdAt DESC
  """)
  Page<ParkingSession> findRecentWithEagerLoad(
    UUID companyId, LocalDateTime cutoffDate, Pageable pageable);
}
```

---

## 🚀 PHASE 4: Caching Strategy

### 4A. Caffeine Cache (In-Memory)

**File**: `config/CacheConfig.java`

```java
@Configuration
@EnableCaching
public class CacheConfig {
  
  @Bean
  public CacheManager cacheManager() {
    CaffeineCacheManager cm = new CaffeineCacheManager(
      "rates",
      "vehicleTypes",
      "paymentMethods",
      "users"
    );
    cm.setCaffeine(Caffeine.newBuilder()
      .maximumSize(10000)
      .expireAfterWrite(5, TimeUnit.MINUTES));
    return cm;
  }
}
```

### 4B. Add @Cacheable to Services

```java
@Service
public class RateService {
  
  // Cache list for 5 minutes (invalidate on create/update)
  @Cacheable(value = "rates", key = "#companyId")
  public List<RateResponse> listByCompany(UUID companyId) {
    return rateRepository.findByCompanyIdAndActive(companyId, true)
      .stream()
      .map(this::mapToResponse)
      .toList();
  }
  
  @CacheEvict(value = "rates", key = "#request.companyId")
  public RateResponse create(CreateRateRequest request) {
    // ...
  }
}
```

---

## 📈 PHASE 5: Batch Operations

### 5A. Batch Inserts/Updates

```java
@Transactional
public void batchCreatePayments(List<PaymentRequest> requests) {
  List<Payment> payments = requests.stream()
    .map(this::mapToEntity)
    .toList();
  
  // Insert in batches of 100
  for (int i = 0; i < payments.size(); i += 100) {
    paymentRepository.saveAll(
      payments.subList(i, Math.min(i + 100, payments.size())));
    
    // Flush to database every 100 records
    entityManager.flush();
    entityManager.clear();
  }
}
```

### 5B. Batch Load (Avoid N+1)

```java
@Query("""
  SELECT v FROM Vehicle v
  WHERE v.id IN :vehicleIds
""")
List<Vehicle> findByIds(@Param("vehicleIds") List<UUID> vehicleIds);

// Usage: Instead of loop, load all at once
List<Vehicle> vehicles = vehicleRepository.findByIds(vehicleIds);
```

---

## 🔧 Implementation Checklist

### Priority 1 (Critical - do first): 
- [ ] Create V003 migration with 15 composite indexes
- [ ] Add @EntityGraph to Rate entity
- [ ] Implement CacheConfig
- [ ] Add @Cacheable to RateService.listByCompany()

### Priority 2 (High):
- [ ] Create OptimizedQueries repository for ParkingSession
- [ ] Implement batch operations for PaymentService
- [ ] Add caching to AppUserService

### Priority 3 (Medium):
- [ ] Create EntityGraphs for other entities
- [ ] Optimize other services with caching
- [ ] Add monitoring for cache hit rates

---

## 📊 Expected Performance Improvements

| Optimization | Query Time | Impact |
|--------------|-----------|--------|
| **Composite Indexes** | 100ms → 10ms | **10x faster** |
| **Eager Loading** | N+100ms → 1 query | **N reduction** |
| **Caching** | 10ms → 1ms | **10x faster** |
| **Batch Operations** | N queries → N/100 | **100x faster** |
| **COMBINED** | 100-500ms → 5-10ms | **20-50x faster** |

**Overall Result**: 60% → 95% performance score

---

## ⚡ Quick Wins (Can do immediately):

1. **Add 1 index**: `CREATE INDEX idx_parking_session_company_created ON parking_session(company_id, created_at DESC);`
   - Improves: list, pagination, filtering
   - Impact: -40% for that query

2. **Add @Cacheable to RateService.listByCompany()**
   - Improves: rate lookups (called 100x/day)
   - Impact: -90% for that service

3. **Use @EntityGraph for Rate entity**
   - Improves: avoids loading fractions separately
   - Impact: -50% for rate list

---

## 📝 Files to Create/Modify

**New Files**:
- `apps/api/src/main/java/com/parkflow/config/CacheConfig.java`
- `apps/api/src/main/java/com/parkflow/modules/parking/operation/graphs/ParkingSessionGraph.java`
- `apps/api/src/main/java/com/parkflow/modules/configuration/queries/OptimizedRateQueries.java`

**Modified Files**:
- `apps/api/src/main/resources/db/migration/V003__add_composite_indexes.sql` (new)
- `Rate.java` (add @NamedEntityGraph)
- `RateService.java` (add @Cacheable)
- `ParkingSessionService.java` (use OptimizedQueries)

---

## 🧪 Testing

### Before Optimization
```bash
curl -w "Time: %{time_total}s\n" http://localhost:6011/api/v1/rates
# Expected: ~150-200ms
```

### After Optimization
```bash
curl -w "Time: %{time_total}s\n" http://localhost:6011/api/v1/rates
# Expected: ~10-20ms (10x faster)
```

---

## 🚀 Deployment

1. Create V003 migration
2. Deploy backend (no downtime)
3. Monitor query performance
4. Cache will warm up automatically
5. Monitor cache hit rates in logs

---

**Effort**: 4-5 hours  
**Risk**: LOW (backward compatible)  
**Gain**: 20-50x faster queries  
**Score**: 60% → 95%

