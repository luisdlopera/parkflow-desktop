# API Transport Layer Stabilization Architecture

This document specifies the stabilized request/response/error transport layer for the ParkFlow application, detailing the unified contracts between the Spring Boot backend modules and the Next.js web / desktop client.

---

## 1. Final Error System Architecture

The transport layer guarantees a uniform response envelope for all HTTP communications (both success and error flows) to ensure that the frontend can consistently parse metadata and structured failures.

### Standard Success Response Envelope
All successful resource payloads (POST, PUT, GET, DELETE) are wrapped as follows:
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Sede Central",
    "status": "ACTIVE"
  },
  "meta": {
    "timestamp": "2026-07-01T14:13:00Z"
  }
}
```

### Standard Error Response Envelope
All failures, whether validation, security, business, or database constraint violations, must return an HTTP status code matching the error semantics and carry this precise payload:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos ingresados no son válidos.",
    "traceId": "corr-123456-abcde",
    "details": {
      "fields": [
        {
          "field": "nit",
          "message": "El NIT ingresado no es válido."
        }
      ]
    }
  }
}
```

---

## 2. Conceptual Handler Design (Spring Boot)

The `GlobalExceptionHandler` interceptor utilizes a type-safe resolution strategy to map exceptions to standard HTTP statuses and serialize them into the uniform response envelope.

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(
            BusinessException ex, 
            HttpServletRequest request) {
        log.warn("Business rule violation: {} - Trace: {}", ex.getMessage(), ex.getTraceId());
        
        ApiResponse<Void> response = ApiResponse.error(
            ex.getErrorCode(),
            ex.getMessage(),
            ex.getTraceId()
        );
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
            MethodArgumentNotValidException ex, 
            HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString();
        log.warn("Validation failure on endpoint: {} - Trace: {}", request.getRequestURI(), traceId);
        
        List<FieldErrorDetail> fields = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> new FieldErrorDetail(f.getField(), f.getDefaultMessage()))
            .toList();
            
        ApiResponse<Void> response = ApiResponse.error(
            ErrorCode.VALIDATION_ERROR.name(),
            "Datos de entrada inválidos",
            traceId,
            Map.of("fields", fields)
        );
        return new ResponseEntity<>(response, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpectedException(
            Exception ex, 
            HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString();
        log.error("Fatal system exception on endpoint: {} - Trace: {}", request.getRequestURI(), traceId, ex);
        
        ApiResponse<Void> response = ApiResponse.error(
            ErrorCode.INTERNAL_ERROR.name(),
            "Ocurrió un error interno en el servidor",
            traceId
        );
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

---

## 3. List of Changes by File / Class

### Backend Changes

1. **[GlobalExceptionHandler.java](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/main/java/com/parkflow/modules/common/exception/GlobalExceptionHandler.java)**
   - Added specific handlers for `ResponseStatusException`, `AuthenticationException`, `HttpMessageNotReadableException`, and MVC parameter binding exceptions.
   - Standardized all exception envelopes to map directly into `ApiResponse.error(...)`.

2. **[ApiKeyAuthFilter.java](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/main/java/com/parkflow/config/ApiKeyAuthFilter.java)**
   - Injected the standard `ObjectMapper` via construction injection.
   - Refactored `writeUnauthorized` to serialize the correct `ApiResponse` JSON structure instead of custom raw string interpolation.

3. **[SecurityConfig.java](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/src/main/java/com/parkflow/config/SecurityConfig.java)**
   - Updated filter instantiation to inject the `objectMapper` Spring Bean.

---

### Frontend Changes

1. **[ApiError.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/errors/ApiError.ts)**
   - Defined structured metadata properties (`status`, `code`, `correlationId`, `details`, `developerMessage`, `payload`).
   - Standardized parameters inside constructor overloads to cleanly support both numbers/messages.

2. **[api-error.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/api/api-error.ts)**
   - Redefined `throwApiError` to throw `ApiError` instances.

3. **[normalize-api-error.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/errors/normalize-api-error.ts)**
   - Configured `normalizeApiError` to parse nested structures (`issues`, `validationIssues`, and `fields`).
   - Implemented dynamic-detection fallback for mock responses lacking `clone` or `text` implementations during testing.
   - Refactored `handleNetworkError` to preserve program developer errors (JSON/syntax/reference rejections) and map connection timeouts to localized messages.

4. **[error-service.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/errors/error-service.ts)**
   - Modified `extractFieldErrors` to accept any format of flat lists or direct `issues` keys from backend validation.

5. **[fetch-with-credentials.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/api/fetch-with-credentials.ts)**
   - Refactored `handleResponse` interceptor to normalize and throw parsed `ApiError`s.
   - Handled `X-Parkflow-Auth-Toast-Silent` headers case-insensitively to suppress automated error toast displays.

6. **[fetch.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/api/fetch.ts)**
   - Simplified `safeFetch` to delegates directly to `normalizeApiError` for HTTP errors, and caught raw exceptions utilizing `handleNetworkError`.
   - Removed redundant string parsing helpers (`safeParse`, `extractResponseError`).

7. **Test Suites Modified**:
   - [fetch.test.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/api/__tests__/fetch.test.ts)
   - [normalize-api-error.test.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/__tests__/normalize-api-error.test.ts)
   - [auth-api.test.ts](file:///Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/web/src/lib/api/__tests__/auth-api.test.ts)

---

## 4. Critical / Current Risks

- **Mock Integrity**: Any new unit tests mocking network calls must make sure they mock basic `Response` methods (such as `json()` or `text()`) or use standard test utilities rather than plain raw objects.
- **Third-Party Headers**: Intercepting `X-Parkflow-Auth-Toast-Silent` requires proxy config to not strip custom client headers.
