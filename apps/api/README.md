# Parkflow API

Backend Spring Boot 3 (Java 21) con arquitectura modular y preparada para crecer.

## Desarrollo

```bash
pnpm dev:api
```

Este comando configura `JAVA_HOME` automaticamente en Windows si detecta Java 21.

Alternativa directa con Gradle wrapper:

```bash
apps/api/gradlew.bat bootRun
```

## Base de datos local

```bash
pnpm db:up
```

Variables por defecto:
- `POSTGRES_USER=parkflow`
- `POSTGRES_PASSWORD=parkflow`
- `POSTGRES_DB=parkflow_dev`
- `DATABASE_URL=jdbc:postgresql://localhost:5432/parkflow_dev`
- `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- `PARKFLOW_API_KEY` (o `app.security.api-key`): compatibilidad para cabecera `X-API-Key` en clientes técnicos/internos.
- `PARKFLOW_JWT_SECRET_BASE64`: secreto base64 para firmar JWT.
- `PARKFLOW_ACCESS_TOKEN_TTL_MINUTES`: expiracion del access token JWT.
- `PARKFLOW_REFRESH_TOKEN_TTL_DAYS`: vida maxima del refresh token.
- `PARKFLOW_OFFLINE_LEASE_HOURS`: lease offline por defecto para desktop.

En `apps/web`, define:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1/operations`
- `NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:8080/api/v1/auth`
- `NEXT_PUBLIC_API_KEY` solo si necesitas compatibilidad con endpoints internos que aún lo lean.
- `NEXT_PUBLIC_DEVICE_ID`, `NEXT_PUBLIC_DEVICE_NAME`, `NEXT_PUBLIC_DEVICE_PLATFORM`, `NEXT_PUBLIC_DEVICE_FINGERPRINT` para login inicial en web o desktop.

## Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/auth/devices`
- `POST /api/v1/auth/devices/revoke`
- `POST /api/v1/auth/devices/authorize`

JWT access token: corto, 15 minutos por defecto.
Refresh token: rotatorio y revocable.
Sesiones: persistidas en `auth_sessions`.
Auditoria: persistida en `auth_audit_log`.
Offline: el desktop guarda sesión en keyring y lease local en SQLite.

## Swagger
- http://localhost:8080/swagger-ui/index.html

## Modulo Operacion (ingreso/salida)

Base path: `/api/v1/operations`

- `POST /entries`: registrar ingreso de vehiculo
- `POST /exits`: registrar salida y cierre
- `GET /sessions/active?ticketNumber=...|plate=...`: buscar sesion activa
- `GET /tickets/{ticketNumber}`: consultar ticket
- `POST /tickets/reprint`: reimprimir ticket (con control de limite por rol)
- `POST /tickets/lost`: procesar ticket perdido (solo manager/admin)

## Modulo Print Jobs (fase inicial)

Base path: `/api/v1/tickets/print-jobs`

- `POST /`: crear trabajo de impresion (idempotente por `idempotencyKey`)
- `PATCH /{id}/status`: actualizar estado de trabajo (`queued`, `processing`, `acked`, `failed`, etc.)
- `POST /{id}/retry`: reencolar trabajo fallido (idempotente por `idempotencyKey`)
- `GET /{id}`: consultar trabajo de impresion
- `GET /?sessionId=...|ticketNumber=...`: listar trabajos por sesion o ticket

## Modulo Sync (fase inicial)

Base path: `/api/v1/sync`

- `POST /push`: recibir eventos desde desktop (idempotente por `idempotencyKey`)
- `GET /pull`: entregar eventos por cursor temporal (`after`, `limit`)

Migraciones Flyway:
- `src/main/resources/db/migration/V1__operations_module.sql`
- `src/main/resources/db/migration/V3__print_jobs.sql`
- `src/main/resources/db/migration/V4__print_attempts_devices_sync_events.sql`
