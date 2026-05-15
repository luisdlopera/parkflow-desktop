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

## Port Architecture

Parkflow usa un sistema de puertos estandarizado con soporte de fallback automático:

| Servicio | Puerto Principal | Fallback |
|----------|-----------------:|---------:|
| Web / Next.js | `6001` | `6002` |
| API / Spring Boot | `6011` | `6012` |
| PostgreSQL | `6021` | N/A |
| Redis | `6031` | N/A |
| WebSocket | `6061` | `6062` |

**Documentación completa**: [docs/architecture/ports.md](docs/architecture/ports.md)

---

## Comandos de Ejecución

### Verificar puertos disponibles

```bash
# Verificar que todos los puertos estén libres
pnpm ports:check
```

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
- Puerto: `6021` (mapeado desde 5432 en container)

### Variables de Entorno Requeridas

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` si necesitas cambiar puertos o credenciales.

3. Configura las variables de seguridad (requeridas para la API):

   ```powershell
   # PowerShell
   $env:PARKFLOW_JWT_SECRET_BASE64="REPLACE_WITH_BASE64_JWT_SECRET"
    $env:PARKFLOW_API_KEY="REPLACE_WITH_SECURE_API_KEY"
   ```

   O en CMD:
   ```cmd
    set PARKFLOW_JWT_SECRET_BASE64=REPLACE_WITH_BASE64_JWT_SECRET
    set PARKFLOW_API_KEY=REPLACE_WITH_SECURE_API_KEY
   ```

### Ejecutar en Desarrollo

```bash
# Ejecutar la API (Spring Boot) - con fallback automático de puerto
pnpm dev:api

# Ejecutar el panel web (Next.js) - con fallback automático de puerto
pnpm dev:web

# Ejecutar el desktop (Tauri)
pnpm dev:desktop

# Ejecutar el agente de impresión
pnpm dev:print-agent
```

> **Nota**: Los scripts `dev:api` y `dev:web` detectan automáticamente si el puerto principal está ocupado y usan el fallback. Verás un mensaje indicando qué puerto quedó activo.

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

# Ver configuración de puertos actual
pnpm ports:config
```

---

## Flujo de Inicio Rápido

1. **Verificar puertos:**
   ```bash
   pnpm ports:check
   ```

2. **Iniciar la base de datos:**
   ```bash
   pnpm db:up
   ```

3. **Configurar variables de entorno** (ver sección anterior)

4. **Iniciar la API:**
   ```bash
   pnpm dev:api
   ```
   La API estará disponible en: http://localhost:6011
   Si el puerto 6011 está ocupado, usará 6012.

5. **En otra terminal, iniciar el desktop:**
   ```bash
   pnpm dev:desktop
   ```

6. **O iniciar el panel web:**
   ```bash
   pnpm dev:web
   ```
   El panel web estará en: http://localhost:6001
   Si el puerto 6001 está ocupado, usará 6002.

---

## Documentación API

- **Swagger UI**: http://localhost:6011/swagger-ui/index.html (o 6012 si usa fallback)
- **OpenAPI JSON**: http://localhost:6011/v3/api-docs
- **Health Check**: http://localhost:6011/actuator/health

---

## Antes de iniciar sesión - Checklist

### 1. Iniciar infraestructura
```bash
# Verificar puertos
pnpm ports:check

# Iniciar base de datos
pnpm db:up

# Verificar que PostgreSQL responde
docker ps | findstr parkflow-postgres
```

### 2. Configurar variables de entorno (PowerShell)
```powershell
   $env:PARKFLOW_JWT_SECRET_BASE64="REPLACE_WITH_BASE64_JWT_SECRET"
$env:PARKFLOW_API_KEY="dev-api-key-123"
```

### 3. Iniciar API y verificar health
```bash
pnpm dev:api
# En otra terminal:
curl http://localhost:6011/actuator/health
```

### 4. Credenciales válidas para login
| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Super Admin | `admin@parkflow.local` | **Qwert.12345** | SUPER_ADMIN |
| Cajero | `cashier@parkflow.local` | **Qwert.12345** | CAJERO |
| Admin Operativo | `operador@parkflow.local` | **Qwert.12345** | ADMIN |

**Requisitos de contraseña:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial (@#$%^&+=!.)

### 5. URLs de acceso
- **Desktop:** Ventana nativa (Tauri)
- **Web:** http://localhost:6001 (o 6002 si usa fallback)
- **API Swagger:** http://localhost:6011/swagger-ui/index.html (o 6012)

---

## Troubleshooting de Puertos

### Ver qué proceso usa un puerto

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :6001
# Luego con el PID:
tasklist /FI "PID eq <PID>"
```

**macOS/Linux:**
```bash
lsof -i :6001
```

### Cambiar puertos si hay conflictos

Edita `.env` en el root del proyecto:

```env
PARKFLOW_WEB_PORT=7001
PARKFLOW_WEB_FALLBACK_PORT=7002
PARKFLOW_API_PORT=7011
PARKFLOW_API_FALLBACK_PORT=7012
```

Ver documentación completa en [docs/architecture/ports.md](docs/architecture/ports.md).

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

---

## Sistema de Licenciamiento Comercial (Nuevo 🎉)

ParkFlow incluye un sistema completo de licenciamiento para modelos de negocio SaaS híbrido offline/cloud.

### Características

- **4 Planes Comerciales**: LOCAL (offline), SYNC (cloud), PRO (multi-sede), ENTERPRISE
- **Licencias Offline**: Validación local con fingerprint de hardware
- **Heartbeat**: Comunicación periódica desktop-backend para comandos remotos
- **Anti-Tampering**: Detección de manipulación de fecha del sistema
- **Panel Super Admin**: Gestión de empresas, licencias y dispositivos

### Documentación del Sistema de Licencias

- **[Guía de Desarrollo](README-DEV.md)** - Setup completo para desarrolladores
- **[Arquitectura de Licensing](docs/LICENSING_ARCHITECTURE.md)** - Detalles técnicos
- **[Setup Rápido](docs/QUICK_SETUP.md)** - Instrucciones de instalación

### Scripts de Licenciamiento

```bash
# Verificar instalación del sistema de licencias
pnpm verify:install

# Generar claves RSA (solo para producción)
pnpm license:keys:generate

# Setup automático de desarrollo
pnpm setup:dev

# Migrar base de datos (incluye tablas de licencias)
pnpm db:migrate
```

### URLs del Panel Admin

- **Panel Super Admin**: http://localhost:6001/admin/companies
- **Activación de Licencia**: Configuración > Licencia en el desktop

### Modo Desarrollo vs Producción

| Aspecto | Desarrollo | Producción |
|---------|-----------|------------|
| Firma de licencias | SHA-256 hash simple | RSA 2048-bit |
| Claves requeridas | No | Sí (PARKFLOW_LICENSE_PRIVATE_KEY) |
| Heartbeat | Cada 30 min | Cada 30 min |
| Anti-tampering | Activo | Activo |

### Licencias en Desarrollo (Un Solo Equipo)

Para probar con un solo equipo:

1. La migración V2 ya crea una empresa de prueba automáticamente
2. El desktop genera fingerprint único de tu hardware
3. Usar la API para generar licencia con ese fingerprint
4. Pegar licenseKey y signature en el desktop

Ver [README-DEV.md](README-DEV.md#desarrollo-de-licencias-un-solo-equipo) para instrucciones detalladas.
