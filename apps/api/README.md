# Parkflow API

Backend Spring Boot 3 (Java 21) con arquitectura modular y preparada para crecer.

## Requisitos previos

- Java 21 (JDK)
- Docker y Docker Compose (para base de datos PostgreSQL)
- Gradle (viene incluido con el wrapper)

## Desarrollo

### 1. Iniciar base de datos

```bash
pnpm db:up
```

O directamente:

```bash
docker compose -f ../../infra/docker-compose.yml up -d
```

### 2. Configurar variables de entorno

Antes de ejecutar la API, establece las siguientes variables de entorno requeridas:

```bash
# JWT Secret (genera uno aleatorio o configura uno seguro en tus entornos)
export PARKFLOW_JWT_SECRET_BASE64="REPLACE_WITH_BASE64_JWT_SECRET"

# API Key para autenticación de clientes técnicos (no usar en repositorio)
export PARKFLOW_API_KEY="REPLACE_WITH_SECURE_API_KEY"
```

**Nota**: Si no se configuran estas variables, la aplicación fallará al iniciar.

### 3. Ejecutar la API

```bash
pnpm dev:api
```

Este comando configura `JAVA_HOME` automaticamente en Windows si detecta Java 21.

Alternativa directa con Gradle wrapper:

```bash
cd apps/api
./gradlew.bat bootRun
```

### Solución de problemas comunes

#### Error de Flyway: checksum mismatch o migración faltante
Si encuentras este error, casi siempre significa que la historia de Flyway de tu base local no coincide con los archivos actuales.
En este proyecto la carpeta de migraciones quedó reducida a:
- `V001__initial_schema.sql`
- `V002__seed_base_data.sql`
- `V003__indexes_and_constraints.sql`

La salida más limpia es resetear el esquema local o ejecutar `flyway repair` sobre esa base antes de volver a levantar la API.

#### Error: "Could not resolve placeholder 'PARKFLOW_JWT_SECRET_BASE64'"
Asegúrate de configurar la variable de entorno `PARKFLOW_JWT_SECRET_BASE64` con un valor base64 válido.

## Documentación API (Swagger)

La API incluye documentación interactiva con Swagger UI:

- **Swagger UI**: http://localhost:6011/swagger-ui/index.html (o 6012 si usa fallback)
- **OpenAPI JSON**: http://localhost:6011/v3/api-docs (o 6012)

### Endpoints públicos (sin autenticación)
- `/actuator/health` - Estado de salud
- `/actuator/info` - Información de la aplicación
- `/actuator/prometheus` - Métricas para monitoreo
- `/swagger-ui/**` - Interfaz de Swagger
- `/v3/api-docs/**` - Documentación OpenAPI
- `/api/v1/auth/login` - Login
- `/api/v1/auth/refresh` - Refresh token

## Base de datos local

```bash
pnpm db:up
```

Variables por defecto:
- `POSTGRES_USER=parkflow`
- `POSTGRES_PASSWORD=parkflow`
- `POSTGRES_DB=parkflow_dev`
- `DATABASE_URL=jdbc:postgresql://localhost:6021/parkflow_dev`
- `CORS_ALLOWED_ORIGINS=http://localhost:6001,http://localhost:6002,http://127.0.0.1:6001,http://127.0.0.1:6002`
- `PARKFLOW_API_KEY` (o `app.security.api-key`): compatibilidad para cabecera `X-API-Key` en clientes técnicos/internos.
- `PARKFLOW_JWT_SECRET_BASE64`: secreto base64 para firmar JWT.
- `PARKFLOW_ACCESS_TOKEN_TTL_MINUTES`: expiracion del access token JWT.
- `PARKFLOW_REFRESH_TOKEN_TTL_DAYS`: vida maxima del refresh token.
- `PARKFLOW_OFFLINE_LEASE_HOURS`: lease offline por defecto para desktop.

En `apps/web`, define:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:6011/api/v1/operations`
- `NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:6011/api/v1/auth`
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
- http://localhost:6011/swagger-ui/index.html (o 6012 si usa fallback)

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
- `src/main/resources/db/migration/V001__initial_schema.sql`
- `src/main/resources/db/migration/V002__seed_base_data.sql`
- `src/main/resources/db/migration/V003__indexes_and_constraints.sql`
