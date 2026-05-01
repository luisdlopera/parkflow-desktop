# Parkflow Port Architecture

## Overview

Este documento define la estrategia de puertos para el monorepo de Parkflow. El objetivo es evitar conflictos de puertos entre servicios y proporcionar fallbacks automáticos cuando los puertos principales están ocupados.

## Port Mapping

| Servicio | Puerto Principal | Fallback | Variable de Entorno | Uso |
|----------|-----------------:|---------:|---------------------|-----|
| **Web / Next.js** | `6001` | `6002` | `PARKFLOW_WEB_PORT` | Frontend web y Tauri dev server |
| **API / Spring Boot** | `6011` | `6012` | `PARKFLOW_API_PORT` | Backend REST API |
| **PostgreSQL** | `6021` | N/A | `PARKFLOW_DB_PORT` | Base de datos (host → container 5432) |
| **Redis** | `6031` | N/A | `PARKFLOW_REDIS_PORT` | Cache/Sessions (host → container 6379) |
| **Desktop Bridge** | `6041` | `6042` | `PARKFLOW_DESKTOP_BRIDGE_PORT` | Comunicación Tauri ↔ API |
| **Printer Service** | `6051` | `6052` | `PARKFLOW_PRINTER_PORT` | Servicio local de impresión |
| **WebSocket** | `6061` | `6062` | `PARKFLOW_WS_PORT` | Realtime/WebSocket server |

## Quick Reference

### URLs por defecto

```
Web Panel:      http://localhost:6001
API Swagger:    http://localhost:6011/swagger-ui.html
API Health:     http://localhost:6011/actuator/health
PostgreSQL:     localhost:6021 (conectar con cliente SQL)
WebSocket:      ws://localhost:6061
```

### Si usas fallback:

```
Web Panel:      http://localhost:6002
API Swagger:    http://localhost:6012/swagger-ui.html
```

## Configuration

### 1. Variables de Entorno (`.env`)

Copia `.env.example` a `.env` en el root del proyecto:

```bash
cp .env.example .env
```

Las variables principales:

```env
# Puertos con valores por defecto (convention over configuration)
PARKFLOW_WEB_PORT=6001
PARKFLOW_WEB_FALLBACK_PORT=6002

PARKFLOW_API_PORT=6011
PARKFLOW_API_FALLBACK_PORT=6012

PARKFLOW_DB_PORT=6021
PARKFLOW_REDIS_PORT=6031

# URLs derivadas (se calculan automáticamente)
NEXT_PUBLIC_API_BASE_URL=http://localhost:6011/api/v1/operations
NEXT_PUBLIC_WS_URL=ws://localhost:6061
```

### 2. Verificar Puertos antes de iniciar

```bash
pnpm ports:check
```

Esto mostrará:
- Qué puertos están libres
- Qué puertos están ocupados y por qué proceso
- Si hay conflictos que necesitan resolución

### 3. Iniciar Servicios

```bash
# Base de datos
pnpm db:up

# API (con fallback automático)
pnpm dev:api

# Web (con fallback automático)
pnpm dev:web

# Desktop (Tauri)
pnpm dev:desktop
```

## Port Resolution Strategy

### Cómo funciona el fallback:

1. **Intenta puerto principal** (ej: 6001)
2. **Si está ocupado**: muestra info del proceso que lo usa
3. **Intenta puerto fallback** (ej: 6002)
4. **Si está libre**: arranca el servicio con mensaje informativo
5. **Si ambos están ocupados**: falla con error claro

### Ejemplo de salida exitosa:

```
[Parkflow Ports] Web primary port 6001 is available.
[Parkflow Web] Starting Next.js on port 6001...
[Parkflow Web] URL: http://localhost:6001
```

### Ejemplo usando fallback:

```
[Parkflow Ports] Web primary port 6001 is busy. (used by: node.exe (PID: 12345))
[Parkflow Ports] Using fallback port 6002.
[Parkflow Web] Starting Next.js on port 6002...
[Parkflow Web] URL: http://localhost:6002
[Parkflow Web] NOTE: Using fallback port because primary was busy.
```

### Ejemplo de error:

```
[Parkflow Ports] Web primary port 6001 is busy. (used by: node.exe (PID: 12345))
[Parkflow Ports] Error: Web ports 6001 and 6002 are both busy.
  Port 6001: node.exe (PID: 12345)
  Port 6002: python.exe (PID: 67890)
  Please free one port or change the environment variables.
```

## Troubleshooting

### Windows (PowerShell)

```powershell
# Ver qué proceso usa el puerto 6001
netstat -ano | findstr :6001

# Ver detalles del proceso (reemplaza <PID>)
tasklist /FI "PID eq <PID>" /FO TABLE

# Matar proceso
 taskkill /PID <PID> /F
```

### macOS/Linux

```bash
# Ver qué proceso usa el puerto 6001
lsof -i :6001

# O más detallado
lsof -i :6001 -P -n

# Matar proceso
kill -9 <PID>
```

### Cambiar puertos personalizados

Si necesitas usar puertos diferentes, edita `.env`:

```env
# Ejemplo: cambiar a rango 7000
PARKFLOW_WEB_PORT=7001
PARKFLOW_WEB_FALLBACK_PORT=7002
PARKFLOW_API_PORT=7011
PARKFLOW_API_FALLBACK_PORT=7012
```

> **IMPORTANTE**: Después de cambiar puertos, reinicia todos los servicios.

## Service-Specific Details

### Web / Next.js

- **Script**: `scripts/dev-web.mjs`
- **Lógica**: Detecta puerto libre y pasa `-p <port>` a Next.js
- **Variables**: Usa `PORT` para el servidor y `NEXT_PUBLIC_*` para URLs del API

### API / Spring Boot

- **Script**: `scripts/dev-api.mjs`
- **Lógica**: Resuelve puerto y pasa `--server.port=<port>` a Gradle
- **Config**: Lee `PARKFLOW_API_PORT` en `application.yml`

### PostgreSQL (Docker)

- **Archivo**: `infra/docker-compose.yml`
- **Mapeo**: `${PARKFLOW_DB_PORT:-6021}:5432`
- **Nota**: No tiene fallback dinámico; si está ocupado, Docker falla
- **Para cambiar**: Modifica `PARKFLOW_DB_PORT` en `.env`

### Redis (Docker)

- **Estado**: Actualmente comentado en docker-compose.yml
- **Cuando se habilite**: Usará `PARKFLOW_REDIS_PORT` (default 6031)

### Tauri Desktop

- **Archivo**: `apps/desktop/src-tauri/tauri.conf.json`
- **Dev URL**: `http://localhost:6001` (o fallback 6002)
- **Limitación conocida**: Tauri requiere URL fija en `tauri.conf.json`
- **Workaround**: El script `dev-web.mjs` exporta `PORT` que Tauri puede leer

## Architecture Decisions

### Por qué estos puertos?

- **6000-6009**: Web y servicios frontend
- **6010-6019**: Backend API
- **6020-6029**: Base de datos
- **6030-6039**: Cache y mensajería
- **6040-6049**: Desktop/Bridge services
- **6050-6059**: Printer/Hardware services
- **6060-6069**: WebSocket/Realtime

### Por qué fallback de +1?

- Fácil de recordar: fallback = principal + 1
- Rango reservado contiguo
- Simple de documentar y automatizar

### Por qué no fallback dinámico para Docker?

- Docker Compose no soporta lógica condicional compleja
- Los servicios de infraestructura deben tener puertos predecibles
- El conflicto debe ser resuelto explícitamente por el desarrollador

## Implementation Files

| Archivo | Propósito |
|---------|-----------|
| `.env.example` | Template de variables de entorno |
| `scripts/port-utils.mjs` | Utilidades de detección de puertos |
| `scripts/dev-web.mjs` | Script de desarrollo Web con fallback |
| `scripts/dev-api.mjs` | Script de desarrollo API con fallback |
| `scripts/check-ports.mjs` | Verificación de todos los puertos |
| `package.json` | Scripts `dev:web`, `dev:api`, `ports:check` |
| `apps/api/src/main/resources/application.yml` | Config Spring Boot |
| `infra/docker-compose.yml` | Config PostgreSQL/Redis |

## Migration Guide (from legacy ports)

Si venías usando los puertos anteriores (3000, 8080, 5432):

1. **Backup**: Guarda tu `.env` actual
2. **Actualiza**: Copia el nuevo `.env.example` a `.env`
3. **Detén**: Todos los servicios y contenedores Docker
4. **Limpia**: `pnpm db:down` y `pnpm db:up` para recrear contenedores
5. **Verifica**: `pnpm ports:check`
6. **Inicia**: `pnpm dev:api` y `pnpm dev:web`

## References

- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [Next.js CLI](https://nextjs.org/docs/api-reference/cli)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Tauri Configuration](https://tauri.app/v1/api/config/)
