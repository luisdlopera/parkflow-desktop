# Frontend Integration Guide — ParkFlow Backend API

## 🚀 Resumen de Cambios

El backend ha sido actualizado para estandarizar respuestas y errores. El frontend debe adaptarse para:

1. **ErrorCode-based error handling** — Parse `error.code`, not `error.message`
2. **Consistent ApiResponse<T> envelope** — Todas las respuestas tienen esta estructura
3. **TenantContext** — El backend automáticamente filtra por company_id del JWT

---

## 📱 Response Contract

### Success Response (HTTP 200/201)

```json
{
  "success": true,
  "data": { ... },  // TU DATO AQUÍ
  "meta": {
    "timestamp": "2026-07-01T12:34:56.789Z",
    "path": "/api/v1/rates",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "error": null,
  "message": "Operacion realizada correctamente"
}
```

**Cómo parsear:**
```typescript
// ✅ CORRECTO
if (response.success) {
  const data = response.data;  // Tu dato está aquí
  // Use data...
} else {
  // Handle error (ver abajo)
}

// ❌ INCORRECTO
// No hagas esto:
const data = response;  // response.data es lo que necesitas
```

### Error Response (HTTP 4xx/5xx)

```json
{
  "success": false,
  "data": null,
  "meta": {
    "timestamp": "2026-07-01T12:34:56.789Z",
    "path": "/api/v1/rates/invalid-id",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "error": {
    "code": "RATE_NOT_FOUND",        // ← USE THIS (stable code)
    "message": "La tarifa no existe",
    "traceId": "550e8400-e29b-41d4",
    "issues": null
  },
  "message": "La tarifa no existe"
}
```

**Cómo parsear:**
```typescript
// ✅ CORRECTO: Parse by error.code
if (response.success === false) {
  switch (response.error.code) {
    case 'RATE_NOT_FOUND':
      toast.error('La tarifa que buscas no existe');
      break;
    case 'INSUFFICIENT_PERMISSIONS':
      redirectToLogin();
      break;
    case 'TENANT_ISOLATION_VIOLATION':
      toast.error('No tienes acceso a este recurso');
      break;
    default:
      toast.error('Error desconocido');
  }
}

// ❌ INCORRECTO: No parsees por message (cambiar mensaje es breaking change)
if (response.error.message === 'La tarifa no existe') { }
```

### Validation Error Response (HTTP 400)

```json
{
  "success": false,
  "data": null,
  "meta": { ... },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los datos ingresados",
    "issues": [
      {
        "field": "email",
        "code": "NOT_BLANK",
        "message": "El correo es obligatorio",
        "rejectedValue": ""
      },
      {
        "field": "plate",
        "code": "INVALID",
        "message": "Placa de vehículo inválida",
        "rejectedValue": "INVALID-PLATE"
      }
    ]
  },
  "message": "Revisa los datos ingresados"
}
```

**Cómo parsear:**
```typescript
// ✅ CORRECTO: Map errors to form fields
if (response.error.code === 'VALIDATION_ERROR' && response.error.issues) {
  const fieldErrors = {};
  response.error.issues.forEach(issue => {
    fieldErrors[issue.field] = issue.message;  // "El correo es obligatorio"
  });
  // Show errors next to form fields
  setFieldErrors(fieldErrors);
}
```

---

## 🔴 Error Code Reference

El backend usa códigos estables. Aquí están los principales:

### Authentication (AUTH_xxx)

| Code | Meaning | Action |
|------|---------|--------|
| `AUTH_001` | Invalid credentials | Show login error, retry login |
| `AUTH_002` | Token expired | Refresh token, retry request |
| `AUTH_003` | Token invalid | Redirect to login |
| `AUTH_004` | Insufficient permissions | Show "access denied" message |

### Business Logic (RATE_xxx, PARKING_xxx, etc.)

| Code | Meaning | Action |
|------|---------|--------|
| `RATE_NOT_FOUND` | Tarifa no existe | Show error, reload list |
| `SESSION_ALREADY_OPEN` | Hay sesión activa | Show error, close first |
| `PARKING_FULL` | Sin espacios | Show "parking full" message |
| `PAYMENT_FAILED` | Payment error | Retry or show error |

### Multi-Tenant (TENANT_xxx)

| Code | Meaning | Action |
|------|---------|--------|
| `TENANT_NOT_FOUND` | Company not found | Redirect to select company |
| `TENANT_ISOLATION_VIOLATION` | Access denied | Show forbidden, log security event |
| `TENANT_QUOTA_EXCEEDED` | Limit reached | Show upgrade prompt |

### Validation (VALIDATION_xxx)

| Code | Meaning | Action |
|------|---------|--------|
| `VALIDATION_ERROR` | Form validation failed | Map to form fields (see above) |
| `INVALID_EMAIL` | Email format invalid | Show inline error |
| `INVALID_PLATE` | Plate format invalid | Show inline error |

**Full list:** See `ErrorCodeRegistry.java` in backend

---

## 🔐 TenantContext — Automatic Filtering

El backend **automáticamente filtra por company_id** del JWT token.

### What This Means

- ✅ No necesitas pasar `company_id` en cada request
- ✅ Backend garantiza que solo ves datos de tu company
- ✅ Si intentas acceder datos de otro company → `TENANT_ISOLATION_VIOLATION`

### What You Need to Do

1. **Include JWT in Authorization header** (ya lo hacen):
```typescript
headers: {
  'Authorization': `Bearer ${jwt_token}`
}
```

2. **Backend extracts `company_id` from JWT claims** (automático)

3. **All queries filtered by company_id** (automático)

**Example:**
```typescript
// Frontend: GET /api/v1/rates
const response = await fetch('/api/v1/rates', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Backend does internally:
// SELECT * FROM rates WHERE company_id = ${extracted_from_jwt}
// User ONLY sees rates for their company
```

---

## 📊 Pagination Response

Para listas grandes:

```json
{
  "success": true,
  "data": [
    { "id": "uuid1", "name": "Tarifa A" },
    { "id": "uuid2", "name": "Tarifa B" }
  ],
  "meta": {
    "timestamp": "...",
    "path": "/api/v1/rates?page=0&size=20",
    "pagination": {
      "type": "offset",
      "page": 0,
      "size": 20,
      "totalElements": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "error": null,
  "message": "..."
}
```

**Cómo usarlo:**
```typescript
const { data, meta } = response;
const { pagination } = meta;

// Show current page info
console.log(`Page ${pagination.page + 1} of ${pagination.totalPages}`);

// Load next page
if (pagination.hasNext) {
  const nextPage = await fetch(`/api/v1/rates?page=${pagination.page + 1}`);
}
```

---

## 🚨 Global Error Handler Template

Usa este template en tu frontend para manejo centralizado de errores:

```typescript
// services/api-client.ts

class ApiClient {
  async request(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      }
    });

    const data = await response.json() as ApiResponse<any>;

    // CRITICAL: Check success field, not HTTP status
    if (!data.success) {
      // Error response
      const error = data.error;
      
      // Handle by error code
      switch (error.code) {
        case 'AUTH_002':  // Token expired
          localStorage.removeItem('jwt_token');
          window.location.href = '/login';
          break;
          
        case 'VALIDATION_ERROR':
          // Map to form fields
          const fieldErrors = {};
          error.issues?.forEach(issue => {
            fieldErrors[issue.field] = issue.message;
          });
          throw new ValidationError(fieldErrors);
          
        case 'TENANT_ISOLATION_VIOLATION':
          toast.error('No tienes acceso a este recurso');
          throw new ForbiddenError(error.message);
          
        default:
          toast.error(error.message);
          throw new ApiError(error.code, error.message);
      }
    }

    // Success response
    return data.data;  // ← Return the actual data, not the wrapper
  }

  // Convenience methods
  async get<T>(url: string): Promise<T> {
    return this.request(url, { method: 'GET' });
  }

  async post<T>(url: string, body: any): Promise<T> {
    return this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async put<T>(url: string, body: any): Promise<T> {
    return this.request(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async patch<T>(url: string, body: any): Promise<T> {
    return this.request(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.request(url, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

**Usage:**
```typescript
// Components use the client transparently
try {
  const rates = await apiClient.get('/api/v1/rates');  // Returns data, not ApiResponse<T>
  setRates(rates);
} catch (error) {
  // Error already handled in apiClient
}
```

---

## 📝 Endpoint Examples

### Create Rate (POST)

**Request:**
```bash
POST /api/v1/rates
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Tarifa Hora",
  "type": "HOURLY",
  "value": 5000
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4",
    "name": "Tarifa Hora",
    "companyId": "...",
    "createdAt": "2026-07-01T..."
  },
  "meta": { ... },
  "error": null
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "issues": [
      { "field": "value", "message": "Value must be positive" }
    ]
  }
}
```

### List Rates (GET with pagination)

**Request:**
```bash
GET /api/v1/rates?page=0&size=20
Authorization: Bearer <jwt>
```

**Response:**
```json
{
  "success": true,
  "data": [ {...}, {...} ],
  "meta": {
    "pagination": {
      "page": 0,
      "size": 20,
      "totalElements": 150,
      "hasNext": true
    }
  },
  "error": null
}
```

### Update Rate (PUT)

**Request:**
```bash
PUT /api/v1/rates/550e8400-e29b-41d4
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Tarifa Hora Updated",
  "value": 6000
}
```

**Response:** Same as Create

### Delete Rate (DELETE)

**Request:**
```bash
DELETE /api/v1/rates/550e8400-e29b-41d4
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "error": null,
  "message": "Operacion realizada correctamente"
}
```

---

## 🧪 Testing the Integration

### 1. Test Success Response
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:6011/api/v1/rates | jq .
```

Expected: `success: true`, `data: [...]`

### 2. Test 404 Error
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:6011/api/v1/rates/invalid-id | jq .
```

Expected: `success: false`, `error.code: "RATE_NOT_FOUND"`

### 3. Test Validation Error
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "", "value": -100}' \
  http://localhost:6011/api/v1/rates | jq .
```

Expected: `success: false`, `error.code: "VALIDATION_ERROR"`, `error.issues: [...]`

### 4. Test TenantContext (access other company's data)
```bash
# With token from Company A, try to access Company B's data
curl -H "Authorization: Bearer <company-b-token>" \
  http://localhost:6011/api/v1/rates/company-a-rate-id | jq .
```

Expected: `success: false`, `error.code: "TENANT_ISOLATION_VIOLATION"`

---

## ✅ Checklist for Frontend

- [ ] Import error codes from backend (or hardcode the list above)
- [ ] Create global ApiClient that returns `data`, not `ApiResponse<T>`
- [ ] Handle errors by `error.code`, not `error.message`
- [ ] Map validation errors to form fields
- [ ] Test with each error scenario (404, 400, 401, 403, etc.)
- [ ] Verify TenantContext works (no cross-company data leaks)
- [ ] Refresh JWT when `AUTH_002` (token expired)
- [ ] Show user-friendly messages for each error code

---

## 🎯 Next Steps

1. **Implement ApiClient** with error handling template above
2. **Update all API calls** to use `apiClient.get/post/put/patch/delete`
3. **Add error handlers** for each error code
4. **Test** with curl commands above
5. **Launch** with confidence that API contract is stable

---

**Generated**: 2026-07-01  
**Backend Version**: 73% → 85%+ (After all phases)  
**Status**: Ready for integration testing
