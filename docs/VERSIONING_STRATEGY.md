# ParkFlow API Versioning Strategy

**Status**: Active v1 → v1.1 → v2.0 Roadmap  
**Effective Date**: 2026-07-01  
**Last Updated**: 2026-07-01

---

## Overview

ParkFlow API versioning follows **Semantic Versioning** with a clear deprecation and migration path for breaking changes.

### Current State
- **Latest Stable**: v1 (current)
- **Breaking Changes**: v2.0 (planned for Sept 2026)
- **Sunset**: v1 endpoints will be removed Dec 2026

---

## Version Definitions

### v1 (Current - Stable)
**Period**: 2026-03-01 → 2026-12-31  
**Commitment**: No breaking changes  
**Base URL**: `/api/v1/*`

**Features**:
- Spring `Page<T>` pagination (mixed with PageResponse<T>)
- Legacy error response formats
- Single API version

### v1.1 (Compatibility Bridge)
**Period**: 2026-07-01 → 2026-09-30  
**Commitment**: Backwards compatible with deprecation warnings  
**Base URL**: `/api/v1/*`

**Changes** (with deprecation headers):
- Introduce `PageResponse<T>` standardization
- New error code enums (v2 format available as preview)
- Feature flags for opt-in v2.0 behaviors

**Headers**:
```
X-Deprecated: true
X-Sunset: 2026-09-30
X-Upgrade-To: /api/v2/...
```

### v2.0 (Breaking Changes - Next)
**Period**: 2026-10-01 → 2027-12-31  
**Base URL**: `/api/v2/*`

**Breaking Changes**:
1. ✅ **Pagination**: `PageResponse<T>` only (no Spring `Page<T>`)
2. ✅ **Error Format**: Typed `ApiError` with error codes
3. ✅ **Soft Delete**: All entities support `deleted_at`
4. ✅ **Optimistic Locking**: `@Version` on mutable entities
5. ✅ **Query Optimization**: `@EntityGraph` for N+1 prevention

---

## Deprecation Timeline

### Phase 1: Announcement (2026-07-01)
- [x] This document published
- [ ] Email sent to all API consumers
- [ ] /actuator/health includes version info

### Phase 2: v1.1 Soft Launch (2026-07-15)
- [ ] Both /api/v1 and /api/v2 endpoints available
- [ ] v1 endpoints return `X-Deprecated: true` header
- [ ] v2 previews available via feature flags

### Phase 3: Feature Flag Rollout (2026-08-01)
- [ ] Companies can opt-in to v2.0 behaviors
- [ ] Feature flag: `api_version_v2_enabled`
- [ ] 30% of traffic on v2 by Aug 15

### Phase 4: Mandatory Migration (2026-09-15)
- [ ] Warning emails to remaining v1 users
- [ ] v1 endpoints log deprecation warnings
- [ ] Target: 90% migrated by Sept 30

### Phase 5: Sunset v1 (2026-10-01)
- [ ] v1 endpoints removed
- [ ] /api/v2 becomes default
- [ ] 404 for any /api/v1 requests

---

## Feature Flags for v2.0 Rollout

### Pagination
```
api.features.pagination_v2_enabled: false → true
```
- When true: All endpoints return `PageResponse<T>`
- When false: Mix of `Page<T>` and `PageResponse<T>`

### Error Codes
```
api.features.error_codes_v2_format: false → true
```
- When true: Response includes typed error codes
- When false: Legacy string error messages

### Soft Delete
```
api.features.soft_delete_enabled: false → true
```
- When true: DELETE returns 204, marks `deleted_at`
- When false: Hard delete (cannot be reversed)

### Optimistic Locking
```
api.features.optimistic_locking_enabled: false → true
```
- When true: Concurrent updates return 409 Conflict
- When false: Last-write-wins (no conflict detection)

### Config
```yaml
# application.yml
app:
  features:
    pagination_v2_enabled: false
    error_codes_v2_format: false
    soft_delete_enabled: false
    optimistic_locking_enabled: false
```

**Tenant Overrides**:
```sql
-- Override pagination for specific tenant
INSERT INTO company_feature_flags (company_id, flag_name, enabled, created_at)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'pagination_v2_enabled', true, NOW());
```

---

## Migration Path for API Consumers

### Step 1: Audit Your Usage
```bash
# Find all /api/v1 calls in your codebase
grep -r "api/v1" . --include="*.js" --include="*.ts" --include="*.py"
```

### Step 2: Test Against v2.0
```bash
# Set feature flag for your tenant to preview v2.0
curl -X PATCH https://api.parkflow.com/api/v1/admin/feature-flags \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "flag": "pagination_v2_enabled",
    "enabled": true
  }'

# Test your API calls
npm test  # Should work with new PageResponse<T> format
```

### Step 3: Update Code
| v1 | v2 | Change |
|----|----|--------|
| `response.content` | `response.data.content` | Wrapped in `data` envelope |
| `response.totalElements` | `response.data.totalElements` | Same |
| `response.last` | `response.data.hasNext` | Inverted logic |
| HTTP 200 on DELETE | HTTP 204 No Content | Status code change |
| Error: `{ "message": "..." }` | `{ "code": "VALIDATION_ERROR", "details": [...] }` | Structured error codes |

### Step 4: Deploy & Monitor
```bash
# 1. Deploy code supporting both v1 + v2
git push origin feature/api-v2-migration

# 2. Test v2 endpoints in staging
curl https://staging-api.parkflow.com/api/v2/rates

# 3. Enable feature flag for 10% of prod traffic
# 4. Monitor error rates for 24h
# 5. Gradually increase to 100%
```

---

## Error Response Changes

### v1 Format
```json
{
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-07-01T12:34:56Z"
}
```

### v2 Format
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "rate_amount",
      "code": "INVALID_RANGE",
      "message": "Must be between 0 and 9999999"
    }
  ],
  "timestamp": "2026-07-01T12:34:56Z"
}
```

---

## Rollback Plan

If v2.0 has critical issues:

```yaml
# application.yml - instant rollback
app:
  features:
    enable_v2_only: false  # Set to true to force v1
    v2_error_rate_threshold: 10.0  # Auto-rollback if errors > 10%
```

**Monitoring**:
- Alert if v2 error rate > 5%
- Auto-disable v2 if > 10% errors
- Snapshot error logs every 5 minutes

---

## FAQ

**Q: Will my v1 code break on Oct 1?**  
A: Yes. Migrate during Phase 4 (Aug-Sept). Contact support if you need extension.

**Q: Can I use v1 and v2 simultaneously?**  
A: Yes. Use feature flags for gradual migration.

**Q: What about existing integrations?**  
A: They'll fail with 404 after v1 sunset. Test migration in staging first.

**Q: How do I get an extension?**  
A: Email api-support@parkflow.com with business justification before Sept 15.

---

## Implementation Checklist

- [ ] Deploy v2.0 endpoints alongside v1 (dual-version mode)
- [ ] Feature flag infrastructure active
- [ ] Deprecation headers added to v1 responses
- [ ] Migration guide published
- [ ] Email sent to API consumers
- [ ] Monitoring dashboards created
- [ ] Staging/canary environment ready
- [ ] Rollback automation in place
- [ ] Sunset date in calendar (Dec 31, 2026)

---

**Questions?** Email api-support@parkflow.com or see [API Error Codes](API_ERROR_CODES.md)
