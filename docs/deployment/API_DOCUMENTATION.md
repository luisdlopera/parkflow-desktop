# ParkFlow API Documentation

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2026-06-25

---

## Quick Start

### Access API Documentation

- **Interactive Swagger UI**: https://api.parkflow.com/api/v1/docs.html
- **OpenAPI 3.0 Schema**: https://api.parkflow.com/api/v1/docs/openapi.json
- **Development (Local)**: http://localhost:6011/api/v1/docs.html

### Authentication

All endpoints require JWT Bearer token authentication (except `/auth/login`):

```bash
# 1. Obtain token
curl -X POST https://api.parkflow.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@parkflow.com",
    "password": "YourPassword123!"
  }'

# Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}

# 2. Use token in subsequent requests
curl -X GET https://api.parkflow.com/api/v1/parking/sessions/current \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Core API Endpoints

### Authentication

#### POST /auth/login
Login with email and password to obtain JWT tokens.

**Request**:
```json
{
  "email": "user@company.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Error Responses**:
- `400 Bad Request`: Missing or invalid email/password
- `401 Unauthorized`: Incorrect credentials
- `429 Too Many Requests`: Rate limited after 5 failed attempts

---

#### POST /auth/refresh
Refresh access token using refresh token.

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Error Responses**:
- `401 Unauthorized`: Refresh token expired or invalid
- `403 Forbidden`: Refresh token revoked

---

### Parking Operations

#### POST /parking/operations/entry
Record vehicle entry into parking facility.

**Request**:
```json
{
  "licensePlate": "ABC-1234",
  "vehicleType": "sedan",
  "entryTerminal": "ENTRADA_NORTE",
  "companySiteId": "site-123"
}
```

**Response** (201 Created):
```json
{
  "sessionId": "session-abc-123",
  "licensePlate": "ABC-1234",
  "vehicleType": "sedan",
  "entryTime": "2026-06-25T14:30:00Z",
  "status": "ACTIVE"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid plate format or vehicle type
- `409 Conflict`: Vehicle already in facility
- `403 Forbidden`: User not authorized for this company/site

---

#### POST /parking/operations/exit
Record vehicle exit and calculate parking charge.

**Request**:
```json
{
  "sessionId": "session-abc-123",
  "exitTerminal": "SALIDA_NORTE",
  "paymentMethod": "cash"
}
```

**Response** (200 OK):
```json
{
  "sessionId": "session-abc-123",
  "licensePlate": "ABC-1234",
  "entryTime": "2026-06-25T14:30:00Z",
  "exitTime": "2026-06-25T15:45:00Z",
  "durationMinutes": 75,
  "amountCharged": 3500,
  "currency": "COP",
  "paymentMethod": "cash",
  "status": "CLOSED",
  "rateApplied": "standard"
}
```

**Error Responses**:
- `404 Not Found`: Session not found
- `400 Bad Request`: Invalid exit data
- `409 Conflict`: Session already closed

---

#### GET /parking/sessions/current
Get active parking sessions at company/site.

**Query Parameters**:
- `companySiteId` (optional): Filter by site
- `limit` (optional): Max results (default 100)
- `status` (optional): Filter by status (ACTIVE, CLOSED, etc.)

**Response** (200 OK):
```json
{
  "data": [
    {
      "sessionId": "session-1",
      "licensePlate": "ABC-1234",
      "vehicleType": "sedan",
      "entryTime": "2026-06-25T14:30:00Z",
      "durationMinutes": 45,
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "total": 52,
    "limit": 100,
    "offset": 0
  }
}
```

---

### Cash Management

#### POST /cash/sessions
Open new cash session.

**Request**:
```json
{
  "companySiteId": "site-123",
  "cashRegisterId": "register-1",
  "openingBalance": 100000,
  "terminal": "CAJA_1"
}
```

**Response** (201 Created):
```json
{
  "sessionId": "cash-session-1",
  "companySiteId": "site-123",
  "cashRegisterId": "register-1",
  "openedAt": "2026-06-25T08:00:00Z",
  "openingBalance": 100000,
  "status": "OPEN"
}
```

---

#### POST /cash/sessions/{id}/close
Close cash session and reconcile.

**Request**:
```json
{
  "closingBalance": 125000,
  "notes": "Session closed at end of day"
}
```

**Response** (200 OK):
```json
{
  "sessionId": "cash-session-1",
  "openedAt": "2026-06-25T08:00:00Z",
  "closedAt": "2026-06-25T17:00:00Z",
  "openingBalance": 100000,
  "closingBalance": 125000,
  "totalIn": 35000,
  "totalOut": 10000,
  "status": "CLOSED",
  "reconciliationStatus": "BALANCED"
}
```

---

#### POST /cash/sessions/{id}/movements
Record cash movement (payment, expense, adjustment).

**Request**:
```json
{
  "type": "PAYMENT",
  "amount": 5000,
  "currency": "COP",
  "description": "Payment from session ABC-123",
  "referenceId": "session-abc-123"
}
```

**Response** (201 Created):
```json
{
  "movementId": "mov-123",
  "sessionId": "cash-session-1",
  "type": "PAYMENT",
  "amount": 5000,
  "currency": "COP",
  "recordedAt": "2026-06-25T14:35:00Z",
  "status": "RECORDED"
}
```

---

### Configuration

#### GET /configuration/rates
Get all parking rates.

**Query Parameters**:
- `companySiteId` (optional): Filter by site
- `status` (optional): ACTIVE, DRAFT, ARCHIVED

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "rate-1",
      "name": "Standard Rate",
      "description": "Standard hourly rate",
      "baseAmount": 3000,
      "currency": "COP",
      "minimumCharge": 3000,
      "status": "ACTIVE",
      "fractions": [
        {
          "durationMinutes": 30,
          "fraction": 0.5
        },
        {
          "durationMinutes": 60,
          "fraction": 1.0
        }
      ]
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 100,
    "offset": 0
  }
}
```

---

#### POST /configuration/rates
Create new parking rate.

**Request**:
```json
{
  "name": "Premium Rate",
  "description": "Premium hourly rate for special events",
  "baseAmount": 5000,
  "currency": "COP",
  "minimumCharge": 5000,
  "companySiteId": "site-123"
}
```

**Response** (201 Created):
```json
{
  "id": "rate-2",
  "name": "Premium Rate",
  "description": "Premium hourly rate for special events",
  "baseAmount": 5000,
  "currency": "COP",
  "minimumCharge": 5000,
  "status": "DRAFT",
  "createdAt": "2026-06-25T14:35:00Z"
}
```

---

#### PATCH /configuration/rates/{id}
Update existing rate.

**Request**:
```json
{
  "baseAmount": 5500,
  "status": "ACTIVE"
}
```

**Response** (200 OK):
```json
{
  "id": "rate-2",
  "baseAmount": 5500,
  "status": "ACTIVE",
  "updatedAt": "2026-06-25T14:40:00Z"
}
```

---

#### DELETE /configuration/rates/{id}
Delete rate (mark as archived).

**Response** (204 No Content)

---

### Reports

#### GET /reports/daily
Get daily parking report.

**Query Parameters**:
- `date` (required): YYYY-MM-DD format
- `companySiteId` (optional): Filter by site

**Response** (200 OK):
```json
{
  "date": "2026-06-25",
  "companySiteId": "site-123",
  "summary": {
    "totalSessions": 1250,
    "totalRevenue": 4375000,
    "currency": "COP",
    "averageStay": 55,
    "peakHour": 14,
    "peakCount": 87
  },
  "byVehicleType": {
    "sedan": {
      "count": 800,
      "revenue": 2800000
    },
    "suv": {
      "count": 300,
      "revenue": 1050000
    },
    "motorcycle": {
      "count": 150,
      "revenue": 525000
    }
  },
  "byHour": [
    {
      "hour": 8,
      "count": 45,
      "revenue": 157500
    }
  ]
}
```

---

#### GET /reports/revenue
Get revenue summary report.

**Query Parameters**:
- `startDate` (required): YYYY-MM-DD
- `endDate` (required): YYYY-MM-DD
- `companySiteId` (optional): Filter by site
- `groupBy` (optional): day, week, month (default: day)

**Response** (200 OK):
```json
{
  "startDate": "2026-06-01",
  "endDate": "2026-06-25",
  "companySiteId": "site-123",
  "groupBy": "day",
  "data": [
    {
      "period": "2026-06-01",
      "revenue": 4500000,
      "currency": "COP",
      "sessions": 1250,
      "avgSessionValue": 3600
    },
    {
      "period": "2026-06-02",
      "revenue": 4620000,
      "currency": "COP",
      "sessions": 1280,
      "avgSessionValue": 3609
    }
  ],
  "totals": {
    "totalRevenue": 112500000,
    "totalSessions": 31250,
    "averageSessionValue": 3600
  }
}
```

---

## Common Response Format

### Success Response (2xx)
```json
{
  "data": { /* endpoint-specific data */ },
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  },
  "timestamp": "2026-06-25T14:35:00Z"
}
```

### Error Response (4xx/5xx)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-06-25T14:35:00Z"
}
```

---

## Error Codes

| Code | HTTP Status | Meaning | Action |
|------|-------------|---------|--------|
| `INVALID_REQUEST` | 400 | Malformed request | Check request format |
| `VALIDATION_ERROR` | 400 | Invalid data | Check validation errors |
| `UNAUTHORIZED` | 401 | Missing/invalid token | Authenticate with /auth/login |
| `FORBIDDEN` | 403 | User lacks permissions | Check user role |
| `NOT_FOUND` | 404 | Resource not found | Check resource ID |
| `CONFLICT` | 409 | Resource state conflict | Retry with updated data |
| `RATE_LIMIT` | 429 | Too many requests | Backoff and retry |
| `INTERNAL_ERROR` | 500 | Server error | Retry with exponential backoff |
| `SERVICE_UNAVAILABLE` | 503 | Service down | Check status page |

---

## Rate Limiting

- **Default**: 100 requests per minute per IP/token
- **Auth Endpoints**: 5 requests per minute
- **Response Header**: `X-RateLimit-Remaining`

When rate limited (429):
```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## Pagination

List endpoints support pagination:

```bash
# Get first 50 items
curl -X GET "https://api.parkflow.com/api/v1/parking/sessions?limit=50&offset=0"

# Get next 50 items
curl -X GET "https://api.parkflow.com/api/v1/parking/sessions?limit=50&offset=50"
```

Response includes:
```json
{
  "pagination": {
    "total": 5000,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Webhook Support (Optional)

Configure webhooks for event notifications:

```bash
# Register webhook
curl -X POST https://api.parkflow.com/api/v1/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/parkflow",
    "events": ["parking.entry", "parking.exit", "cash.session.closed"],
    "secret": "webhook-secret-key"
  }'
```

Webhook events:
- `parking.entry`: Vehicle enters facility
- `parking.exit`: Vehicle exits facility
- `cash.session.opened`: Cash session opened
- `cash.session.closed`: Cash session closed
- `rate.updated`: Rate configuration changed

---

## Integration Examples

### Python Client

```python
import requests
from datetime import datetime, timedelta

class ParkFlowClient:
    def __init__(self, base_url, email, password):
        self.base_url = base_url
        self.session = requests.Session()
        self.authenticate(email, password)
    
    def authenticate(self, email, password):
        resp = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        token = resp.json()["accessToken"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def get_daily_report(self, date, company_site_id):
        resp = self.session.get(
            f"{self.base_url}/reports/daily",
            params={"date": date, "companySiteId": company_site_id}
        )
        return resp.json()["data"]
    
    def record_entry(self, plate, vehicle_type, site_id):
        resp = self.session.post(
            f"{self.base_url}/parking/operations/entry",
            json={
                "licensePlate": plate,
                "vehicleType": vehicle_type,
                "companySiteId": site_id
            }
        )
        return resp.json()["data"]

# Usage
client = ParkFlowClient(
    "https://api.parkflow.com/api/v1",
    "admin@parkflow.com",
    "password"
)
report = client.get_daily_report("2026-06-25", "site-123")
print(f"Today's revenue: ${report['summary']['totalRevenue']}")
```

### JavaScript/Node.js Client

```javascript
const axios = require('axios');

class ParkFlowClient {
  constructor(baseUrl, email, password) {
    this.baseUrl = baseUrl;
    this.client = axios.create({ baseURL: baseUrl });
    this.authenticate(email, password);
  }

  async authenticate(email, password) {
    const { data } = await this.client.post('/auth/login', { email, password });
    this.client.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
  }

  async getDailyReport(date, companySiteId) {
    const { data } = await this.client.get('/reports/daily', {
      params: { date, companySiteId }
    });
    return data.data;
  }

  async recordEntry(licensePlate, vehicleType, companySiteId) {
    const { data } = await this.client.post('/parking/operations/entry', {
      licensePlate, vehicleType, companySiteId
    });
    return data.data;
  }
}

// Usage
const client = new ParkFlowClient(
  'https://api.parkflow.com/api/v1',
  'admin@parkflow.com',
  'password'
);
```

---

## Monitoring & Debugging

### Health Check
```bash
# API health status
curl https://api.parkflow.com/actuator/health

# Database connectivity
curl https://api.parkflow.com/actuator/health/db

# Disk space
curl https://api.parkflow.com/actuator/health/diskSpace
```

### Metrics
```bash
# Prometheus metrics
curl https://api.parkflow.com/actuator/prometheus

# Key metrics:
# - http_requests_total: Total HTTP requests
# - http_request_duration_seconds: Request latency
# - db_connection_active: Active database connections
```

### Debugging

Enable debug logging:
```bash
# In application-dev.yml
logging:
  level:
    com.parkflow: DEBUG
    org.springframework.web: DEBUG
```

---

## Support & Troubleshooting

- **API Status**: https://status.parkflow.com
- **Documentation**: https://docs.parkflow.com
- **Support Email**: support@parkflow.com
- **GitHub Issues**: https://github.com/parkflow/api/issues

---

**Last Updated**: 2026-06-25  
**API Version**: 1.0.0  
**Status**: ✅ Production Ready
