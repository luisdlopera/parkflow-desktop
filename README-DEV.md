# ParkFlow - Guía de Desarrollo

## Requisitos Previos

- **Java 21** (JDK)
- **Node.js 20+** con **pnpm**
- **Rust** (para Tauri)
- **PostgreSQL 15+** (o usar Docker)
- **OpenSSL** (para generar claves RSA en producción)

## Setup Rápido (5 minutos)

### 1. Clonar e Instalar Dependencias

```bash
# Clonar repositorio
git clone https://github.com/luisdlopera/parkflow-desktop.git
cd parkflow-desktop

# Instalar dependencias
pnpm install

# Verificar herramientas
java -version      # Debe mostrar Java 21
pnpm -v           # Debe mostrar 8.x o superior
cargo -v          # Debe mostrar Rust 1.70+
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# En Windows (PowerShell)
copy .env.example .env
```

Editar `.env` con tus valores:
```bash
# JWT Secret (generar nuevo para producción)
PARKFLOW_JWT_SECRET_BASE64=VKShGl6Hkv2V4dxJ2R6OOSSQqBGP4CILhK5neP5B6zA=

# API Key
PARKFLOW_API_KEY=dev-api-key-123
```

**En desarrollo NO necesitas claves RSA** - el sistema usa hashing simple.

### 3. Iniciar Base de Datos

```bash
# Usando Docker (recomendado)
pnpm db:up

# O usar PostgreSQL local (configurar en .env)
# PARKFLOW_DB_PORT=5432
# POSTGRES_USER=parkflow
# POSTGRES_PASSWORD=tu-password
```

### 4. Migrar Base de Datos

```bash
cd apps/api
./gradlew flywayMigrate
```

### 5. Iniciar Servicios

**Opción A - Todo automático (desarrollo):**
```bash
# Terminal 1: Backend API
pnpm dev:api

# Terminal 2: Desktop App (con web integrada)
pnpm dev:desktop
```

**Opción B - Por separado:**
```bash
# Backend (Java)
cd apps/api
./gradlew bootRun

# Web (Next.js)
cd apps/web
pnpm dev

# Desktop (Tauri)
cd apps/desktop
pnpm tauri dev
```

## Desarrollo de Licencias (Un Solo Equipo)

En desarrollo con un solo equipo, el sistema usa **modo desarrollo** que no requiere claves RSA:

### Flujo de Pruebas de Licencias:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Desktop   │────▶│  Backend    │────▶│   Guardar   │
│  (Fingerprint      │ (Crear      │      │  Licencia   │
│   automático)      │  Empresa)   │      │  Local      │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Pasos para Probar Licencias:

#### 1. Crear Empresa de Prueba

La migración V2 ya crea una empresa automáticamente:
- **ID**: `00000000-0000-0000-0000-000000000001`
- **Nombre**: ParkFlow Development
- **Plan**: PRO
- **Estado**: ACTIVE

#### 2. Obtener Fingerprint de Tu Equipo

En la app desktop:
1. Ir a **Configuración > Licencia**
2. El fingerprint se genera automáticamente
3. Copiar el valor (ej: `fp-a1b2c3d4...`)

#### 3. Generar Licencia vía API

```bash
curl -X POST http://localhost:6011/api/v1/licensing/licenses/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-123" \
  -d '{
    "companyId": "00000000-0000-0000-0000-000000000001",
    "deviceFingerprint": "TU_FINGERPRINT_AQUI",
    "hostname": "dev-workstation"
  }'
```

**Respuesta:**
```json
{
  "deviceId": "...",
  "licenseKey": "abc123...",
  "signature": "xyz789...",
  "expiresAt": "2027-05-01T00:00:00Z",
  "publicKey": ""
}
```

#### 4. Activar Licencia en Desktop

En la interfaz desktop:
1. Pegar `licenseKey`
2. Pegar `signature`
3. Click en **Activar**

#### 5. Verificar Activación

El sistema mostrará:
- ✅ Licencia válida
- 📅 Días restantes
- 🏢 Nombre de empresa
- 📋 Plan activo

## Scripts Útiles

### Build

```bash
# Web
pnpm build:web

# Desktop
pnpm build:desktop

# API (Java)
cd apps/api
./gradlew build
```

### Tests

```bash
# Backend (Java)
cd apps/api
./gradlew test

# Web (TypeScript/React)
cd apps/web
pnpm test
```

### Database

```bash
# Iniciar PostgreSQL en Docker
pnpm db:up

# Detener PostgreSQL
pnpm db:down

# Ver logs
pnpm db:logs
```

### Verificación

```bash
# Verificar puertos
pnpm ports:check

# Ver configuración de puertos
pnpm ports:config

# Verificar instalación de licensing
.\infra\scripts\verify-install.ps1  # Windows
./infra/scripts/verify-install.sh   # Linux/Mac
```

## Panel Super Admin (Desarrollo)

Acceder al panel de administración:

```
http://localhost:6001/admin/companies
```

**Funcionalidades:**
- Ver empresas registradas
- Crear nuevas empresas
- Generar licencias offline
- Ver dispositivos activos
- Enviar comandos remotos

## Seguridad en Desarrollo

### Variables Importantes

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| `PARKFLOW_LICENSE_MODE` | `development` | `production` |
| `PARKFLOW_LICENSE_PRIVATE_KEY` | (vacío) | (requerido) |
| `PARKFLOW_LICENSE_PUBLIC_KEY` | (vacío) | (requerido) |

### Lista de Verificación Seguridad

- [ ] JWT Secret cambiado de valor default
- [ ] API Key cambiada de `dev-api-key-123`
- [ ] Base de datos no expuesta públicamente
- [ ] Puerto 6011 (API) bloqueado en firewall
- [ ] `.env` y `infra/keys/` en `.gitignore`

## Troubleshooting

### Error: "No se puede conectar al backend"

```bash
# Verificar API está corriendo
curl http://localhost:6011/actuator/health

# Verificar puertos
pnpm ports:check
```

### Error: "Database connection failed"

```bash
# Verificar PostgreSQL
pnpm db:up

# Verificar migraciones
cd apps/api
./gradlew flywayInfo
./gradlew flywayMigrate
```

### Error: "License validation failed"

En desarrollo, asegúrate de:
1. Tener la empresa creada (verificar en DB)
2. Usar el fingerprint correcto
3. Que no haya expirado la licencia

### Desktop no compila (Rust/Tauri)

```bash
# Reinstalar dependencias Rust
cd apps/desktop/src-tauri
cargo clean
cargo build

# Verificar toolchain
rustup show
rustup target add x86_64-pc-windows-msvc
```

### Error: "cannot find symbol" en compilación Java (Gradle cache corruption)

**Síntomas:**
```
Compilation failed; see the compiler error output for details.
error: cannot find symbol
  symbol:   variable dayStart
  location: class SupervisorService
```

**Solución - Limpiar caché incremental:**

```bash
# Opción 1: Script rápido (recomendado)
pnpm api:clean

# Opción 2: Manual
cd apps/api
./gradlew clean --quiet
./gradlew compileJava

# Opción 3: Revalidar todo
pnpm validate
```

**Causa raíz:**
El compilador incremental de Gradle mantiene bytecode compilado antiguo cuando hay cambios en los archivos fuente. Ocurre típicamente después de refactorings o merges conflictivos.

**Prevención:**
- Ejecutar `pnpm api:clean` después de cambios significativos en el repositorio
- Si usas CI/CD, ejecutar builds sin cache: `./gradlew build --no-build-cache`
- Hacer commit de cambios antes de cambiar de rama

## Estructura de Proyecto

```
parkflow-desktop/
├── apps/
│   ├── api/              # Backend Java/Spring
│   ├── web/              # Frontend Next.js
│   ├── desktop/          # Tauri (Rust + Web)
│   └── print-agent/      # Servicio de impresión
├── packages/
│   ├── types/            # Tipos compartidos
│   └── print-core/       # Lógica de impresión
├── infra/
│   ├── scripts/          # Scripts de utilidad
│   ├── keys/             # Claves RSA (NO COMMITEAR)
│   └── docker-compose.yml
├── docs/
│   ├── LICENSING_ARCHITECTURE.md
│   └── QUICK_SETUP.md
└── README-DEV.md         # Este archivo
```

## Comandos Rápidos de Referencia

```bash
# Setup inicial
pnpm install && cp .env.example .env && pnpm db:up

# Desarrollo día a día
pnpm dev:api      # Terminal 1
pnpm dev:desktop  # Terminal 2

# Tests
./gradlew test                    # Backend
pnpm --filter @parkflow/web test  # Frontend

# Build producción
./gradlew build       # Backend JAR
pnpm build:desktop    # Desktop installer
```

## Recursos Adicionales

- [Documentación Arquitectura](docs/LICENSING_ARCHITECTURE.md)
- [Setup Rápido](docs/QUICK_SETUP.md)
- [Spring Boot Docs](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Tauri Docs](https://tauri.app/v1/guides/)
- [Next.js Docs](https://nextjs.org/docs)

---

¿Problemas? Crear un issue en GitHub o contactar al equipo de desarrollo.
