# Runbook: Debugging API Requests

This guide explains how to investigate and resolve issues with API requests in the Parkflow platform.

## 1. Identify the Problem

Start by gathering as much information as possible from the client (Web, Desktop, or third-party client):
- **Endpoint:** The full URL and HTTP method (e.g., `POST /api/v1/operations/entries`).
- **HTTP Status Code:** (e.g., 400, 401, 403, 404, 500).
- **Correlation ID:** Check the `X-Correlation-Id` header in the response. This is the most important piece of information.
- **Request Body:** The JSON payload sent to the server.
- **Error Message:** The JSON body of the error response.

## 2. Locate Logs with Correlation ID

Once you have the `correlationId`, you can search the logs to see exactly what happened during that specific request.

### In Local Development
Grep the log files or check the IDE console:
```bash
grep "CORR_ID_HERE" apps/api/logs/parkflow.log
```

### In Production (ELK / CloudWatch / etc.)
Search for the `correlationId` field in your logging dashboard.

## 3. Analyze the Error Trace

Logs should contain:
- The incoming request details (logged by filters/interceptors).
- Any database queries executed during the request.
- Stack traces for any unhandled exceptions.
- Business logic logs indicating state transitions or validation failures.

## 4. Check the Database

Use the `correlationId` or business identifiers (like `plate` or `ticketNumber`) to check the state of the database:
```sql
SELECT * FROM parking_sessions WHERE ticket_number = '...';
```

## 5. Reproduce the Issue

### Using Bruno / Postman / cURL
Try to replicate the request using the same headers and body. Ensure you include a valid `X-Correlation-Id` for easier tracking.

### Using Unit/Integration Tests
Check if there is an existing test for the endpoint:
- Path: `apps/api/src/test/java/com/parkflow/modules/.../`
- Run the test: `./gradlew test --tests "com.parkflow.modules.parking.operation.service.*"`

## 6. Common Resolution Paths

- **401 Unauthorized:** Check JWT expiration or API Key validity.
- **403 Forbidden:** Check user roles and permissions in `SecurityConfig`.
- **400 Bad Request:** Validate the `RequestDTO` against the payload. Check for validation annotations (`@NotBlank`, `@NotNull`, etc.).
- **500 Internal Server Error:** Look for `NullPointerException` or database constraint violations in the logs.
- **Sync Issues:** Check the `sync_events` table and correlation between desktop/api.
