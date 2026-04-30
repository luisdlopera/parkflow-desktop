# Parkflow Monorepo

Plataforma de parqueaderos desktop-first preparada para crecer a web y backend escalable.

## Apps
- `apps/desktop`: Tauri 2 (desktop, hardware, offline, sync agent)
- `apps/web`: Next.js (panel admin, tarifas, usuarios, reportes)
- `apps/api`: Spring Boot 3 (negocio central, auth, auditoria, sync)

## Packages
- `packages/types`: contratos v1 (`TicketDocument`, print jobs, sync) y layout de preview de tiquete (`ticket-layout.ts`).
- `packages/print-core`: utilidades de impresión compartidas.
- `packages/ui` / `packages/sdk`: no definidos aun en el monorepo.

---

## Requisitos Previos

- **Node.js 18+** y **pnpm**
- **Java 21 (JDK)** - para el backend Spring Boot
- **Docker** y **Docker Compose** - para la base de datos PostgreSQL
- **Rust** - para compilar Tauri (desktop)

---

## Comandos de Ejecución

### Base de Datos (PostgreSQL)

```bash
# Iniciar la base de datos
pnpm db:up

# Detener la base de datos
pnpm db:down
```

Credenciales por defecto:
- Usuario: `parkflow`
- Contraseña: `parkflow`
- Base de datos: `parkflow_dev`
- Puerto: `5432`

### Variables de Entorno Requeridas

Antes de ejecutar la API, configura estas variables:

```powershell
# PowerShell
$env:PARKFLOW_JWT_SECRET_BASE64="VKShGl6Hkv2V4dxJ2R6OOSSQqBGP4CILhK5neP5B6zA="
$env:PARKFLOW_API_KEY="dev-api-key-123"
```

O en CMD:
```cmd
set PARKFLOW_JWT_SECRET_BASE64=VKShGl6Hkv2V4dxJ2R6OOSSQqBGP4CILhK5neP5B6zA=
set PARKFLOW_API_KEY=dev-api-key-123
```

### Ejecutar en Desarrollo

```bash
# Ejecutar la API (Spring Boot)
pnpm dev:api

# Ejecutar el panel web (Next.js)
pnpm dev:web

# Ejecutar el desktop (Tauri)
pnpm dev:desktop

# Ejecutar el agente de impresión
pnpm dev:print-agent
```

### Comandos de Construcción

```bash
# Construir la aplicación web
pnpm build:web

# Construir el desktop
pnpm build:desktop
```

### Otros Comandos

```bash
# Ejecutar linter en la web
pnpm lint:web
```

---

## Flujo de Inicio Rápido

1. **Iniciar la base de datos:**
   ```bash
   pnpm db:up
   ```

2. **Configurar variables de entorno** (ver sección anterior)

3. **Iniciar la API:**
   ```bash
   pnpm dev:api
   ```
   La API estará disponible en: http://localhost:8080

4. **En otra terminal, iniciar el desktop:**
   ```bash
   pnpm dev:desktop
   ```

5. **O iniciar el panel web:**
   ```bash
   pnpm dev:web
   ```
   El panel web estará en: http://localhost:3000

---

## Documentación API

- **Swagger UI**: http://localhost:8080/swagger-ui/index.html
- **OpenAPI JSON**: http://localhost:8080/v3/api-docs
- **Health Check**: http://localhost:8080/actuator/health

---

## Antes de iniciar sesión - Checklist

### 1. Iniciar infraestructura
```bash
# Iniciar base de datos
pnpm db:up

# Verificar que PostgreSQL responde
docker ps | findstr parkflow-postgres
```

### 2. Configurar variables de entorno (PowerShell)
```powershell
$env:PARKFLOW_JWT_SECRET_BASE64="VKShGl6Hkv2V4dxJ2R6OOSSQqBGP4CILhK5neP5B6zA="
$env:PARKFLOW_API_KEY="dev-api-key-123"
```

### 3. Iniciar API y verificar health
```bash
pnpm dev:api
# En otra terminal:
curl http://localhost:8080/actuator/health
```

### 4. Credenciales válidas para login
| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Admin | `admin@parkflow.local` | **Qwert.12345** | ADMIN |
| Cajero | `cashier@parkflow.local` | **Qwert.12345** | CAJERO |

**Requisitos de contraseña:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial (@#$%^&+=!.)

### 5. URLs de acceso
- **Desktop:** Ventana nativa (Tauri)
- **Web:** http://localhost:3000
- **API Swagger:** http://localhost:8080/swagger-ui/index.html

---

## Seed Data (Datos Iniciales)

La base de datos incluye datos iniciales automáticos:

Tarifas preconfiguradas:
- Hora carro: $4,000 COP (gracia: 10 min)
- Hora moto: $2,000 COP (gracia: 10 min)

---

## Mejoras de seguridad implementadas

### Rate Limiting
- Login: 10 intentos por minuto (previene brute force)
- Operaciones: 100 requests/minuto
- API general: 200 requests/minuto

### Logging de auditoría
- Todos los intentos de login se registran con IP y deviceId
- Contraseñas enmascaradas en logs (a***@example.com)
- Tokens de reset tienen expiración de 1 hora

### Recuperación de contraseña
- Flujo completo: `/forgot-password` → email (o token en dev) → `/reset-password`
- Tokens de un solo uso con hash SHA-256
- Máximo 3 tokens activos por usuario

---

## Desarrollo rapido (Legacy)

## Como depurar bugs y endpoints

Para una trazabilidad completa, sigue estas pautas:

1. **Correlation ID:** Todas las peticiones al API aceptan y devuelven el header `X-Correlation-Id`. Úsalo para buscar en los logs.
2. **Documentación de Endpoints:** Consulta [docs/api/ENDPOINTS.md](docs/api/ENDPOINTS.md) para ver el catálogo completo de controladores, DTOs y lógica asociada.
3. **Guías de Resolución:** Si encuentras un error común, revisa la carpeta [docs/troubleshooting/](docs/troubleshooting/).
4. **Logs del API:** En local, los logs se muestran en la consola. En producción, usa el `correlationId` en tu agregador de logs.
5. **Runbook de Debug:** Para un paso a paso detallado, consulta [docs/runbooks/debug-api-request.md](docs/runbooks/debug-api-request.md).

## Base de datos local (dev)

```bash
pnpm db:up
```

## Notas de migracion
- El backend en produccion usa **Flyway + JPA** (`apps/api`). El panel web usa el API por HTTP.
- El API Spring (`apps/api`) ahora usa login de usuario con JWT corto + refresh rotatorio. `X-API-Key` queda solo como compatibilidad para clientes técnicos o protección interna, no como auth de usuario.
- Documentacion de auditoria produccion: `docs/architecture/production-readiness-audit.md` y checklist `docs/runbooks/production-validation-checklist.md`.

## Auth y offline

Ver `docs/architecture/auth-hybrid-v1.md` para el diseño completo y `docs/runbooks/auth-offline.md` para validación operativa.

Variables nuevas relevantes:
- API: `PARKFLOW_JWT_SECRET_BASE64`, `PARKFLOW_ACCESS_TOKEN_TTL_MINUTES`, `PARKFLOW_REFRESH_TOKEN_TTL_DAYS`, `PARKFLOW_OFFLINE_LEASE_HOURS`
- Web/Desktop: `NEXT_PUBLIC_AUTH_BASE_URL`, `NEXT_PUBLIC_DEVICE_ID`, `NEXT_PUBLIC_DEVICE_NAME`, `NEXT_PUBLIC_DEVICE_PLATFORM`, `NEXT_PUBLIC_DEVICE_FINGERPRINT`
