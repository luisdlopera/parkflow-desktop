# ParkFlow - Arquitectura de Licenciamiento Comercial

## Resumen Ejecutivo

Este documento describe la arquitectura completa de licenciamiento y control comercial implementada para ParkFlow, un sistema SaaS híbrido offline-first para gestión de parqueaderos en Colombia.

## Modelo Comercial

### Planes Disponibles

| Plan | Precio Estimado | Características | Target |
|------|-----------------|-----------------|--------|
| **LOCAL** | COP $150K-300K/año | 100% offline, tickets, caja, impresión local | Parqueaderos pequeños sin internet |
| **SYNC** | COP $500K-800K/año | Sync cloud, dashboard web, backup, reportes | Parqueaderos con internet |
| **PRO** | COP $1.2M-2M/año | Multi-sede, auditoría, monitoreo, API | Cadenas de parqueaderos |
| **ENTERPRISE** | Cotización | Personalizado, SLA, soporte dedicado | Grandes operadores |

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              PANEL SUPER ADMIN                          │
│                    (Aplicación Web Next.js - Super Admin)               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │
│  │ Empresas    │ │ Licencias   │ │ Dispositivos│ │ Monitoreo        │   │
│  │ Módulos     │ │ Heartbeats  │ │ Auditoría   │ │ Caja Remota      │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ API REST
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Java/Spring)                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    MÓDULO LICENSING                                │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │Company  │  │Licensed  │  │Company   │  │LicenseAuditLog   │  │   │
│  │  │Entity   │  │Device    │  │Module    │  │Entity            │  │   │
│  │  └─────────┘  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────────────┐│   │
│  │  │ LicenseService (Generación, Validación, Heartbeat)         ││   │
│  │  └────────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                           │                                            │
│                           ▼ PostgreSQL                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              ┌─────────────────┐   ┌─────────────────────┐
              │   PLAN LOCAL    │   │   PLAN SYNC/PRO    │
              │   100% Offline  │   │   Con conexión      │
              └────────┬────────┘   └──────────┬──────────┘
                       │                        │
                       ▼                        ▼
           ┌────────────────────┐    ┌────────────────────────┐
           │   APP DESKTOP      │    │   APP DESKTOP + WEB   │
           │   (Tauri + Rust)   │    │   (Tauri + Next.js)   │
           │                    │    │                        │
           │  ┌──────────────┐  │    │  ┌────────────────┐    │
           │  │ Licensing    │  │    │  │ Licensing      │    │
           │  │ Module       │  │    │  │ Module + Sync  │    │
           │  │              │  │    │  │                │    │
           │  │ - Fingerprint│  │    │  │ - Heartbeat    │    │
           │  │ - Signature  │  │    │  │ - Cloud Sync   │    │
           │  │ - Tamper     │  │    │  │ - Remote Cmd   │    │
           │  │   Detection  │  │    │  │                │    │
           │  └──────────────┘  │    │  └────────────────┘    │
           └────────────────────┘    └────────────────────────┘
```

## Estructura de Carpetas

```
apps/
├── api/src/main/java/com/parkflow/modules/licensing/
│   ├── controller/
│   │   └── LicensingController.java      # API REST para licensing
│   ├── dto/
│   │   ├── HeartbeatRequest.java         # Request/Response DTOs
│   │   ├── LicenseValidationRequest.java
│   │   ├── CompanyResponse.java
│   │   └── ...
│   ├── entity/
│   │   ├── Company.java                  # Entidad principal
│   │   ├── LicensedDevice.java           # Dispositivos licenciados
│   │   ├── CompanyModule.java            # Módulos habilitables
│   │   └── LicenseAuditLog.java          # Auditoría
│   ├── enums/
│   │   ├── CompanyStatus.java            # ACTIVE, PAST_DUE, etc.
│   │   ├── PlanType.java                 # LOCAL, SYNC, PRO
│   │   ├── LicenseStatus.java
│   │   ├── ModuleType.java
│   │   └── RemoteCommand.java
│   ├── repository/
│   │   ├── CompanyRepository.java
│   │   ├── LicensedDeviceRepository.java
│   │   ├── CompanyModuleRepository.java
│   │   └── LicenseAuditLogRepository.java
│   └── service/
│       └── LicenseService.java           # Lógica de negocio
│
├── desktop/src-tauri/src/
│   └── licensing/
│       ├── mod.rs                        # Módulo principal + commands
│       ├── types.rs                      # Structs y tipos
│       ├── fingerprint.rs                # Generación de fingerprint
│       ├── storage.rs                    # Almacenamiento seguro
│       ├── crypto.rs                     # Validación de firmas
│       └── tamper.rs                     # Detección de manipulación
│
└── web/src/
    ├── lib/licensing/
    │   ├── types.ts                       # TypeScript types
    │   ├── api.ts                         # API client
    │   └── hooks.ts                       # React hooks
    │
    └── components/licensing/
        ├── LicenseBanner.tsx              # Banner de advertencia
        ├── LicenseStatusCard.tsx          # Card de estado
        └── LicenseActivationDialog.tsx    # Diálogo de activación
```

## Tablas de Base de Datos

### companies
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(200) | Nombre comercial |
| nit | VARCHAR(20) | NIT colombiano |
| plan | VARCHAR(20) | LOCAL/SYNC/PRO/ENTERPRISE |
| status | VARCHAR(20) | ACTIVE/PAST_DUE/SUSPENDED/BLOCKED/EXPIRED |
| expires_at | TIMESTAMP | Fecha de vencimiento |
| grace_until | TIMESTAMP | Fin de período de gracia |
| max_devices | INTEGER | Límite de dispositivos |
| max_locations | INTEGER | Límite de sedes |
| max_users | INTEGER | Límite de usuarios |
| offline_mode_allowed | BOOLEAN | Permite operación offline |
| license_signature | TEXT | Firma digital de licencia |

### licensed_devices
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| company_id | UUID | FK a companies |
| device_fingerprint | VARCHAR(100) | Hash único del dispositivo |
| hostname | VARCHAR(100) | Nombre del equipo |
| operating_system | VARCHAR(50) | OS del dispositivo |
| license_key | VARCHAR(200) | Clave de licencia asignada |
| status | VARCHAR(20) | ACTIVE/EXPIRED/REVOKED/etc |
| signature | TEXT | Firma digital |
| last_heartbeat_at | TIMESTAMP | Último heartbeat |
| pending_command | VARCHAR(50) | Comando remoto pendiente |

### company_modules
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| company_id | UUID | FK a companies |
| module_type | VARCHAR(30) | Tipo de módulo |
| enabled | BOOLEAN | Habilitado/deshabilitado |
| expires_at | TIMESTAMP | Expiración específica |

## Estados de Licencia y Bloqueos

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  TRIAL   │────▶│  ACTIVE  │────▶│ PAST_DUE │────▶│SUSPENDED │
└──────────┘     └──────────┘     └────┬─────┘     └────┬─────┘
     │               │                  │                │
     │               │                  │                │
     ▼               ▼                  ▼                ▼
  ┌─────┐         ┌─────┐           ┌─────┐          ┌─────┐
  │14   │         │Opera│           │Solo │          │Solo │
  │días │         │ción │           │lect│          │lect │
  │gratis         │norma│           │ura +│          │ura  │
  │     │         │l    │           │warn │          │     │
  └─────┘         └─────┘           └─────┘          └─────┘
                                          │                │
                                          ▼                ▼
                                    ┌──────────┐     ┌──────────┐
                                    │  EXPIRED │     │ BLOCKED  │
                                    │(solo lect│     │(bloqueo │
                                    │ura)      │     │total)   │
                                    └──────────┘     └──────────┘
```

### Comportamiento por Estado

| Estado | Entradas Nuevas | Cobros | Reportes | Consulta | Admin Message |
|--------|-----------------|--------|----------|----------|---------------|
| ACTIVE | ✅ | ✅ | ✅ | ✅ | ❌ |
| TRIAL | ✅ | ✅ | ✅ | ✅ | ❌ |
| PAST_DUE | ✅ (con warning) | ✅ | ✅ | ✅ | ✅ |
| SUSPENDED | ❌ | ❌ | ✅ | ✅ | ✅ |
| EXPIRED | ❌ | ❌ | ✅ | ✅ | ✅ |
| BLOCKED | ❌ | ❌ | ❌ | ❌ | ✅ |

## Sistema de Heartbeat

### Flujo

```
Desktop                    API Backend
   │                           │
   │─── Heartbeat (30min) ────▶│
   │   {deviceFingerprint,     │
   │    appVersion,             │
   │    pendingSyncCount}       │
   │                           │
   │◄──── HeartbeatResponse ───│
   │    {status, expiresAt,    │
   │     command, message,      │
   │     allowOperations}      │
   │                           │
   │◄──── Ejecutar comando ────│
   │    (si aplica)            │
```

### Comandos Remotos Soportados

| Comando | Acción | Requiere Ack |
|---------|--------|--------------|
| BLOCK_SYSTEM | Bloquear operaciones | Sí |
| DISABLE_SYNC | Deshabilitar sync | Sí |
| DISABLE_MODULE | Deshabilitar módulo | Sí |
| SHOW_ADMIN_MESSAGE | Mostrar mensaje | No |
| FORCE_UPDATE | Forzar actualización | Sí |
| REQUEST_RENEWAL | Solicitar renovación | No |
| PAYMENT_REMINDER | Recordatorio pago | No |

## Validación Offline

### Algoritmo de Fingerprint

```rust
fingerprint = SHA256(
    hostname +
    os_info +
    cpu_info +
    mac_address +
    disk_id +
    motherboard_id
)
```

### Proceso de Validación

1. **Verificar existencia**: ¿Hay licencia almacenada?
2. **Verificar fingerprint**: ¿Coincide con este dispositivo?
3. **Verificar firma**: ¿La firma criptográfica es válida?
4. **Verificar tiempo**: ¿No hay manipulación de fecha?
5. **Verificar expiración**: ¿La licencia está vigente?

### Anti-Tampering

- Guardar últimos 10 timestamps válidos
- Detectar rollback de tiempo (> 5 minutos)
- Contador de violaciones (máx 3)
- Bloqueo automático tras 3 violaciones

## Roadmap de Implementación

### Fase 1 - MVP (Semanas 1-2)
- ✅ Entidades y repositorios Java
- ✅ API de heartbeat y validación
- ✅ Fingerprinting básico en Tauri
- ✅ Almacenamiento seguro de licencia
- ✅ Detección de tampering básica

### Fase 2 - Comercial (Semanas 3-4)
- ⏳ Panel Super Admin web
- ⏳ Generación de licencias offline
- ⏳ Sistema de renovación
- ⏳ UX comercial (banners, alertas)

### Fase 3 - Avanzado (Semanas 5-6)
- ⏳ Firma RSA/ECDSA real
- ⏳ Comandos remotos avanzados
- ⏳ Sincronización mejorada
- ⏳ Reportes de auditoría

### Fase 4 - Enterprise (Futuro)
- ⏳ SLA y monitoreo
- ⏳ Integraciones API
- ⏳ Facturación electrónica DIAN
- ⏳ WhatsApp notifications

## Configuración Requerida

### Variables de Entorno (Backend)

```bash
# Claves para firma de licencias (generar con RSA)
PARKFLOW_LICENSE_PRIVATE_KEY=base64_encoded_private_key
PARKFLOW_LICENSE_PUBLIC_KEY=base64_encoded_public_key
```

### Generar Par de Claves RSA

```bash
# Generar clave privada
openssl genrsa -out license_key.pem 2048

# Extraer clave pública
openssl rsa -in license_key.pem -pubout -out license_public.pem

# Convertir a base64 para environment
cat license_key.pem | base64 -w 0
cat license_public.pem | base64 -w 0
```

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Clonación de licencias | Media | Alto | Fingerprint único por hardware |
| Rollback de fecha | Baja | Alto | Detección de tampering |
| Reverse engineering | Media | Medio | Ofuscación + firma RSA |
| Perdida de licencia | Baja | Medio | Backup en keyring |
| Bloqueo falso positivo | Baja | Alto | Período de gracia + soporte |

## Próximos Pasos Inmediatos

1. **Configurar claves RSA** en variables de entorno
2. **Migrar base de datos** con `V2__licensing_tables.sql`
3. **Probar flujo completo**: Generar licencia → Validar offline → Heartbeat
4. **Implementar panel admin** con tablas de empresas y licencias
5. **Desplegar ambiente de prueba** para validación comercial

---

Documento generado: Mayo 2026
Versión: 1.0
Autor: ParkFlow Engineering Team
