# ADR-0005: Phased API Endpoint Deprecation Path

**Status**: Accepted  
**Date**: 2026-06-25  
**Version**: 1.0  

---

## Context

ParkFlow API used both `/api/v1/settings/*` and `/api/v1/configuration/*` endpoints for the same resources (rates, users, vehicles). This led to:

- Client confusion: "Which endpoint should I call?"
- Testing burden: Maintain two code paths
- Documentation duplication
- Migration complexity for existing users

---

## Decision

**Consolidate on `/api/v1/configuration/*` as canonical. Deprecate `/api/v1/settings/*` over 3 sprints with clear timeline.**

### Timeline

#### Sprint 4 (Current)
- Both endpoints work
- `/api/v1/settings/*` returns `X-Deprecated: true` header
- Clients log warnings

```
GET /api/v1/settings/rates
  ↓
200 OK
X-Deprecated: true
X-Sunset: Tue, 01 Jul 2026 23:59:59 GMT
{rates...}
```

#### Sprint 5 (Week of 2026-06-30)
- Continue supporting both endpoints
- Increase logging: "Please migrate to /api/v1/configuration/*"
- Client SDKs updated to prefer `/configuration/*`

#### Sprint 6+ (Week of 2026-07-07)
- Remove `/api/v1/settings/*` endpoints
- Return 410 Gone with deprecation notice
- Clients using legacy endpoints fail explicitly (not silently)

### Implementation

#### Controller Routing
```java
// Canonical endpoint (new clients)
@RestController
@RequestMapping("/api/v1/configuration/rates")
public class RateConfigurationController {
  private final RateManagementService rateService;
  
  @GetMapping
  public Page<RateResponse> listRates(Pageable pageable) { ... }
  
  @PostMapping
  public RateResponse createRate(@Valid @RequestBody CreateRateRequest req) { ... }
}

// Deprecated endpoint (legacy support)
@RestController
@RequestMapping("/api/v1/settings/rates")
@Deprecated(since = "2.5.0", forRemoval = true)
public class DeprecatedSettingsRateController {
  private final RateConfigurationController canonical;
  
  @GetMapping
  public ResponseEntity<?> listRates(Pageable pageable) {
    return ResponseEntity.ok()
      .header("X-Deprecated", "true")
      .header("X-Sunset", "Tue, 01 Jul 2026 23:59:59 GMT")
      .body(canonical.listRates(pageable));
  }
}
```

#### Client Library Migration
```javascript
// Old: clients using /settings/
const rates = await fetch('/api/v1/settings/rates');

// New: redirect to /configuration/
const rates = await fetch('/api/v1/configuration/rates');

// With deprecation warning logged
console.warn('[DEPRECATED] /api/v1/settings/* endpoints removed 2026-07-07. Use /api/v1/configuration/* instead.');
```

---

## Affected Endpoints

| Resource | Old | New | Status |
|----------|-----|-----|--------|
| Rates | `/api/v1/settings/rates` | `/api/v1/configuration/rates` | Migrating |
| Users | `/api/v1/settings/users` | `/api/v1/configuration/users` | Migrating |
| Vehicle Types | `/api/v1/settings/vehicle-types` | `/api/v1/configuration/vehicle-types` | Migrating |

---

## Related ADRs

- [ADR-0001: Hexagonal Architecture](0001-hexagonal-architecture.md) — Port-based design enables easy deprecation

---

**Last Updated**: 2026-06-25  
**Status**: Phase 1 (Dual support)  
**Enforcement**: HTTP headers + developer alerts
