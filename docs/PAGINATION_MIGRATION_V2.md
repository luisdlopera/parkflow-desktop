# Pagination Migration Guide: v1 → v2.0

**Acción #4**: Standardize all 283 endpoints to `PageResponse<T>`

## Summary

All ParkFlow API endpoints will return a unified `PageResponse<T>` response format in v2.0.

### v1 Format (Current)
Mixed: 72 × `PageResponse<T>`, 133 × Spring `Page<T>`, 78 no pagination

### v2.0 Format (Target)
Unified: 283 × `PageResponse<T>`

---

## Response Format

### Spring Page<T> (v1) ❌
```json
{
  "content": [...],
  "pageable": { "pageNumber": 0, "pageSize": 20 },
  "totalElements": 1250,
  "last": false,
  "empty": false
}
```

### PageResponse<T> (v2.0) ✅
```json
{
  "success": true,
  "data": {
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 1250,
    "totalPages": 63,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-07-01T12:34:56Z",
    "apiVersion": "v2.0"
  }
}
```

---

## Migration Checklist

- [ ] 72 controllers return `PageResponse<T>`
- [ ] 133 controllers migrated from `Page<T>` to `PageResponse<T>`
- [ ] 78 controllers add pagination where missing
- [ ] Default pagination: size=20, sort=createdAt:DESC
- [ ] Frontend client code updated
- [ ] Tests pass for all paginated endpoints
- [ ] Backwards compatibility via feature flag

---

## Migration Status by Module

| Module | PageResponse | Spring Page | No Pagination | Status |
|--------|-------------|-------------|---------------|--------|
| configuration | 12 | 8 | 5 | ⏳ IN PROGRESS |
| cash | 8 | 3 | 0 | ⏳ IN PROGRESS |
| parking/operation | 10 | 5 | 3 | ⏳ IN PROGRESS |
| reports | 15 | 8 | 2 | ⏳ IN PROGRESS |
| licensing | 6 | 2 | 1 | ⏳ IN PROGRESS |
| billing | 4 | 2 | 1 | ⏳ IN PROGRESS |

---

## Implementation

Use feature flag: `pagination_v2_enabled`

```java
@GetMapping
public Object listRates(Pageable pageable) {
  if (featureFlags.isV2PaginationEnabled(tenantId)) {
    return pageResponseService.wrap(repository.findAll(pageable));
  } else {
    return repository.findAll(pageable);  // Spring Page<T>
  }
}
```

---

**Timeline**: Aug 1 - Sept 30, 2026  
**Deprecation**: v1 Page<T> removed Oct 1, 2026
