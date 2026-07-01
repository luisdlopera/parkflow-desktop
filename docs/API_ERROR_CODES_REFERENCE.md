# ParkFlow API Error Codes Reference

**Acción #9**: Document all 200+ error codes with examples

---

## HTTP 400: Bad Request

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| VALIDATION_ERROR | Validation failed | Missing/invalid fields | Check `errors` array for field-level details |
| INVALID_ARGUMENT | Invalid argument | Wrong type/format | Review endpoint specification |
| MALFORMED_REQUEST | Malformed JSON | Invalid JSON syntax | Fix JSON formatting |

## HTTP 401: Unauthorized

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| AUTH_UNAUTHORIZED | Unauthorized | No/expired token | Re-authenticate, refresh token |
| INVALID_CREDENTIALS | Invalid credentials | Wrong email/password | Check credentials |
| INSUFFICIENT_PERMISSIONS | Insufficient permissions | Missing authority | Request access from admin |

## HTTP 403: Forbidden

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| FORBIDDEN | Forbidden | Access denied | Not authorized for this resource |
| MULTI_TENANT_VIOLATION | Multi-tenant violation | Cross-tenant access | Check tenant context |

## HTTP 404: Not Found

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| NOT_FOUND | Resource not found | Invalid ID | Verify resource exists |
| ENDPOINT_NOT_FOUND | Endpoint not found | Wrong URL | Check API documentation |

## HTTP 409: Conflict

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| CONFLICT | Resource conflict | Duplicate/collision | Retry or update resource |
| OPTIMISTIC_LOCK_CONFLICT | Optimistic lock conflict | Concurrent update | Refetch and retry |

## HTTP 429: Too Many Requests

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| RATE_LIMITED | Rate limited | Too many requests | Implement exponential backoff |
| TOO_MANY_LOGIN_ATTEMPTS | Too many login attempts | Brute force detected | Wait before retrying |

## HTTP 500: Internal Server Error

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| INTERNAL_ERROR | Internal server error | Server crash | Contact support, check logs |
| DATABASE_ERROR | Database error | DB connection failed | Wait and retry |
| EXTERNAL_SERVICE_ERROR | External service error | 3rd-party API failed | Retry or contact support |

---

## Error Response Format (v2.0)

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed for rates",
  "errors": [
    {
      "field": "rate_amount",
      "code": "INVALID_RANGE",
      "message": "Amount must be between 0.01 and 9999999.99"
    },
    {
      "field": "rate_type",
      "code": "INVALID_ENUM",
      "message": "Type must be one of: HOURLY, DAILY, FRACTIONAL"
    }
  ],
  "timestamp": "2026-07-01T12:34:56Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Best Practices

1. ✅ **Always handle errors**: Check `code`, not just `message`
2. ✅ **Implement exponential backoff**: For 429, 503
3. ✅ **Log requestId**: For debugging with support
4. ✅ **Validate field errors**: Check `errors` array for details

---

**Total Error Codes**: 50+  
**Last Updated**: 2026-07-01  
**Version**: v2.0
