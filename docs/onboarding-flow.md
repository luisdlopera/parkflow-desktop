# Onboarding Flow — ParkFlow

**Última actualización:** 2026-06-28
**Propósito:** Documentar en detalle cada paso del asistente de configuración inicial (onboarding), incluyendo qué hace, qué valida, qué persiste, y cómo se relaciona con el módulo de configuración.

---

## Arquitectura General

El onboarding es un wizard de **12 pasos** que un administrador completa después de registrar una empresa en ParkFlow. Su función es recolectar la configuración mínima necesaria para operar el parqueadero y **materializar** los recursos correspondientes (tipos de vehículo, métodos de pago, tarifas, lockers, capacidad).

### Flujo de Datos

```
Usuario edita paso → Zustand (estado local)
  → Autosave cada 10s → PUT /api/v1/onboarding/companies/{id}/steps
    → Backend valida y sanitiza por plan
      → Guarda en onboarding_progress.progress_data (JSONB)
      
Usuario hace clic en "Finalizar"
  → POST /api/v1/onboarding/companies/{id}/complete
    → buildSettingsFromProgress() → JSON de settings
      → Upsert CompanySettings (JSONB en DB)
      → Materializa: vehicle types, payment methods, lockers, capacity, rates
      → Marca onboarding_completed = true
```

### Estados del Progreso

| Estado | Descripción |
|--------|-------------|
| `currentStep = 1..12` | Paso actual del wizard |
| `completed = false` | En progreso |
| `completed = true` | Onboarding finalizado exitosamente |
| `skipped = true` | Omitido (se aplicaron valores por defecto) |
| `onboardingCompleted = true` (Company) | Flag en la empresa que indica que ya pasó por onboarding |

---

## Paso 1: Tipos de Vehículo

**Obligatorio:** ✅ Sí
**Restringido por plan:** ❌ No

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `vehicleTypes` | `string[]` (checkbox) | ✅ Mínimo 1 | MOTO, CARRO, BICICLETA, CAMIONETA, CAMIÓN, BUS, OTRO |
| `helmetHandling` | `enum` | ✅ Si incluye MOTOCICLETA | `LOCKERS` o `NONE` |
| `helmetTokenCount` | `number` | ✅ Si LOCKERS | Cantidad de lockers (1-9999) |
| `operationalProfile` | `enum` | (inferido) | `MOTORCYCLE_ONLY`, `CAR_ONLY`, `MIXED` |

### Reglas de Validación

**Frontend (onboarding-logic.ts):**
- Al menos 1 tipo de vehículo seleccionado
- Si `MOTORCYCLE` está seleccionado: `helmetHandling` es requerido
- Si `helmetHandling === "LOCKERS"`: `helmetTokenCount` debe ser 1-9999

**Backend (OnboardingProgressService.validateStepData):**
- Mismas validaciones que frontend, más:
- `helmetHandling` solo acepta: `LOCKERS`, `MANUAL`, `NONE`
- `helmetTokenCount` > 0 y <= 9999

### Perfil Operacional

Se infiere automáticamente de los tipos de vehículo seleccionados:

| Vehículos seleccionados | Perfil |
|------------------------|--------|
| Solo MOTORCYCLE | `MOTORCYCLE_ONLY` |
| Solo CAR | `CAR_ONLY` |
| Cualquier combinación (incluyendo ambos u otros) | `MIXED` |

### Lo que materializa al completar

- Tipos de vehículo asociados a la compañía (vía `CompanyVehicleTypeManagementService.addTypeToCompany()`)
- Lockers físicos si `helmetHandling === "LOCKERS"` (IDs: L-001, L-002, etc.)
- Perfil operacional asignado a la entidad `Company`

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Tipos de vehículo | `?section=masters` — agregar/editar/eliminar tipos |
| Manejo de cascos | `?section=setup` → pestaña "Cascos" — cambiar modo |
| Lockers | `/configuracion/lockers` — CRUD completo |
| Perfil operacional | Solo en onboarding (depende de tipos activos) |

---

## Paso 2: Capacidad

**Obligatorio:** ✅ Sí
**Restringido por plan:** ❌ No

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `totalCapacity` | `number` | ✅ > 0 | Capacidad total del parqueadero |
| `controlSlots` | `boolean` | No | ¿Controlar capacidad por tipo de vehículo? |
| `capacityByType` | `Map<string, number>` | Si controlSlots | Capacidad por tipo de vehículo |

### Reglas de Validación

- `totalCapacity` > 0
- Si `controlSlots === true`: la suma de `capacityByType` no debe exceder `totalCapacity`

### Lo que materializa al completar

- Redimensiona la capacidad del parqueadero vía `ParkingSpaceService.resizeCapacity()`

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Capacidad total | `?section=setup` → pestaña "Capacidad" |
| Capacidad individual por espacios | `/configuracion/espacios` — grid completo |

---

## Paso 3: Tarifas

**Obligatorio:** ✅ Sí
**Restringido por plan:** ❌ No
**Tamaño:** ~507 líneas (el paso más complejo del wizard)

### Modelos de Cobro (Billing Models)

| Modelo | Descripción | Requiere |
|--------|-------------|----------|
| `HOURLY` | Por hora | `baseValue` |
| `FRACTION` | Por fracción | `baseValue`, `hasFractions` |
| `FLAT` | Tarifa única | `flatRate` |
| `FULL_DAY` | Día completo | `flatRate` |
| `MIXED` | Mixto (combina varios) | `baseValue` |

### Presets

| Preset | Modelo | Configuración |
|--------|--------|---------------|
| **Básico** | HOURLY | Sin extras, redondeo exacto |
| **Comercial** | HOURLY | Fracciones 15min + cortesía 15min + redondeo 15min |
| **24 Horas** | MIXED | Tarifa nocturna 20:00-06:00 + tarifa día completo |

### Campos (19 whitelisted)

| Campo | Tipo | Requerido | Dónde aparece |
|-------|------|-----------|---------------|
| `billingModel` | `enum` | ✅ | Modelo de cobro |
| `baseValue` | `number` | ✅ (HOURLY/FRACTION/MIXED) | Tarifa base |
| `flatRate` | `number` | ✅ (FLAT/FULL_DAY) | Tarifa única/día completo |
| `fullDayRate` | `number` | Si `hasFullDayRate` | Tarifa día completo adicional |
| `hasNightRate` | `boolean` | No | Activar tarifa nocturna |
| `nightStartTime` | `time` (HH:MM) | ✅ Si hasNightRate | Inicio tarifa nocturna |
| `nightEndTime` | `time` (HH:MM) | ✅ Si hasNightRate | Fin tarifa nocturna |
| `nightRate` | `number` | ✅ Si hasNightRate | Valor tarifa nocturna |
| `hasWeekendRate` | `boolean` | No | Activar tarifa fin de semana |
| `weekendRate` | `number` | ✅ Si hasWeekendRate | Valor tarifa fin de semana |
| `hasFractions` | `boolean` | No | Activar cobro por fracciones |
| `minFractionMinutes` | `number` | ✅ Si hasFractions | Minutos mínimos de fracción |
| `fractionValue` | `number` | ✅ Si hasFractions | Valor de cada fracción |
| `hasCourtesy` | `boolean` | No | Activar minutos de cortesía |
| `graceMinutes` | `number` | ✅ Si hasCourtesy | Minutos gratis |
| `rounding` | `enum` | No | EXACT, 15_MIN, 30_MIN, 1_HOUR |
| `enableRateByType` | `boolean` | No | Tarifas diferentes por vehículo |
| `ratesByType` | `Map<string, number>` | Si enableRateByType | Valor por tipo |

### Validación Backend (Step3DataValidator)

- Whitelist de 19 campos permitidos (campos extra se ignoran silenciosamente — protección S-03)
- Valores monetarios: 0 — 9,999,999
- Formato hora: `HH:MM` validado con regex
- `billingModel`: Must be HOURLY, FRACTION, FLAT, FULL_DAY, MIXED
- `rounding`: Must be EXACT, 15_MIN, 30_MIN, 1_HOUR

### Lo que materializa al completar

- Crea registros `Rate` en la BD (una tarifa `HOURLY` por tipo de vehículo)
- Las tarifas existentes se desactivan (`active = false`) antes de crear las nuevas

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Tarifas (CRUD completo) | `?section=rates` — filtro por sede, texto, activo |
| Fracciones de tiempo | `/configuracion/fracciones` — brackets por tarifa |

---

## Paso 4: Configuración Regional y Caja

**Obligatorio:** ✅ Sí
**Restringido por plan:** ❌ No

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `countryCode` | `enum` | ✅ | CO, MX, AR, CL, PE, US, OTHER |
| `platePattern` | `string` | (automático) | Patrón de placa según país |
| `platePrefix` | `string` | No | Prefijo opcional de placa |
| `numTerminals` | `number` | No (default 1) | Número de terminales/cajas |
| `enabled` | `boolean` | No | ¿Manejas caja por operador? |

### Formatos de Placa por País

| País | Formato | Ejemplo |
|------|---------|---------|
| Colombia | ABC123 | ABC123 |
| México | ABC1234 | ABC1234 |
| Argentina | AB123CD | AB123CD |
| Chile | ABCD12 | ABCD12 |
| Perú | ABC123 | ABC123 |
| Estados Unidos | ABC1234 | ABC1234 |
| Otro | Libre | Libre |

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| País / formato de placa | `?section=setup` → pestaña "Región" |
| Prefijo de placa | `?section=setup` → pestaña "Región" |
| Terminales/cajas | `/configuracion/cajas` — CRUD completo |
| Caja por operador | `?section=setup` → pestaña "Región" / `?section=modules` |

---

## Paso 5: Turnos

**Obligatorio:** ❌ No
**Restringido por plan:** ❌ No

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `enabled` | `boolean` | No | ¿Trabajan por turnos? |
| `dayShiftStart` | `time` | Si enabled | Inicio turno diurno (default 06:00) |
| `dayShiftEnd` | `time` | Si enabled | Fin turno diurno (default 18:00) |
| `nightShiftStart` | `time` | Si enabled | Inicio turno nocturno (default 18:00) |
| `nightShiftEnd` | `time` | Si enabled | Fin turno nocturno (default 06:00) |

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Turnos (enable/disable y horarios) | `?section=setup` → pestaña "Turnos" |
| Módulo de turnos | `?section=modules` |

---

## Paso 6: Métodos de Pago

**Obligatorio:** ✅ Sí
**Restringido por plan:** ❌ No (pero filtrado por plan)

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `paymentMethods` | `string[]` | ✅ Mínimo 1 | CASH, DEBIT_CARD, CREDIT_CARD, NEQUI, DAVIPLATA, TRANSFER, QR, AGREEMENT, MIXED |

### Filtro por Plan

| Plan | Métodos disponibles |
|------|-------------------|
| LOCAL | Solo CASH |
| SYNC | Todos |
| PRO | Todos |
| ENTERPRISE | Todos |

### Backend Sanitize

En `sanitizeStepDataByPlan()`: los métodos seleccionados se filtran contra los permitidos por el plan. Métodos no permitidos se eliminan silenciosamente.

### Lo que materializa al completar

- Crea registros `PaymentMethod` asociados a la compañía (uno por código seleccionado)

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Métodos de pago (CRUD) | `/configuracion/metodos-pago` |

---

## Paso 7: Tickets

**Obligatorio:** ❌ No
**Restringido por plan:** ❌ No

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `printerType` | `enum` | No | THERMAL, DESKJET, WHATSAPP, NONE |
| `printerName` | `string` | No | Nombre de la impresora |
| `ticketPrefix` | `string` | No (default "T-") | Prefijo del consecutivo, max 10, mayúsculas, sin espacios |
| `allowReprint` | `boolean` | No | Permitir reimpresión |
| `showTicketPreview` | `boolean` | No | Vista previa antes de imprimir |

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Impresoras (CRUD) | `/configuracion/impresoras` — tipo, conexión, sede |
| Parámetros de tickets | `?section=parameters` — prefijo, reimpresión |

---

## Paso 8: Clientes y Mensualidades

**Obligatorio:** ❌ No
**Restringido por plan:** ✅ Sí (PRO/ENTERPRISE)

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `enabled` | `boolean` | No | ¿Manejas clientes frecuentes o mensualidades? |

### Planes que lo permiten

| Plan | Acceso |
|------|--------|
| LOCAL | ❌ No — se fuerza `enabled = false` |
| SYNC | ❌ No — se fuerza `enabled = false` |
| PRO | ✅ Sí |
| ENTERPRISE | ✅ Sí |

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Módulo de clientes | `?section=modules` — toggle `clients` |
| Contratos mensuales (CRUD) | `?section=monthly` |

---

## Paso 9: Convenios

**Obligatorio:** ❌ No
**Restringido por plan:** ✅ Sí (PRO/ENTERPRISE)

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `enabled` | `boolean` | No | ¿Tienes convenios con empresas? |
| `agreementDiscount` | `number` | Si enabled | Descuento 0-100% |

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Convenios (CRUD) | `?section=agreements` |
| Módulo de convenios | `?section=modules` — toggle `agreements` |

---

## Paso 10: Sedes

**Obligatorio:** ❌ No
**Restringido por plan:** ✅ Sí (PRO/ENTERPRISE)

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `multiSite` | `boolean` | No | ¿Varias sedes? |
| `siteName1` | `string` | Si multiSite | Nombre sede principal |
| `siteName2` | `string` | Si multiSite | Nombre sede secundaria |

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Sedes (CRUD) | `/configuracion/sedes` |
| Parámetros operativos por sede | `/configuracion/operacion` |

---

## Paso 11: Roles y Permisos

**Obligatorio:** ❌ No
**Restringido por plan:** ✅ Sí (PRO/ENTERPRISE)

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `advanced` | `boolean` | No | Permisos avanzados |

### ¿Se puede cambiar después en Configuración?

| Aspecto | Dónde se cambia |
|---------|----------------|
| Usuarios y roles | `?section=users` — CRUD usuarios, roles |

---

## Paso 12: Auditoría (Resumen)

**Obligatorio:** ❌ No
**Restringido por plan:** ❌ No

### Funcionalidad

Paso **informativo** (solo lectura). Muestra un resumen de:
- Perfil operacional detectado
- Tipos de vehículo (cantidad)
- Capacidad configurada
- Tarifa base
- Caja por operador (sí/no)
- Turnos (sí/no)

No hay formulario que completar. Es una pantalla de confirmación antes de finalizar.

---

## Acciones Globales del Onboarding

### Guardar Paso (Autosave)

- Se ejecuta **cada 10 segundos** si los datos del paso actual cambiaron
- PUT `/api/v1/onboarding/companies/{id}/steps` con `{ step, data, targetStep }`
- `targetStep` = paso actual para autosave (no navega)
- Indicador visual: "Guardando..." → "Guardado" → "Error al guardar"
- Optimistic UI update: SWR `mutate(optimisticNext, false)` antes del PUT

### Navegar Siguiente/Anterior

- Valida el paso actual antes de navegar
- Si es válido: `persistStep(targetStep)` → PUT con targetStep = siguiente paso
- Si hay error: muestra errores en pantalla, no navega

### Finalizar (Complete)

POST `/api/v1/onboarding/companies/{id}/complete`:

1. Valida consistencia de capacidad (Step 2)
2. Construye settings finales desde todos los pasos (`buildSettingsFromProgress`)
3. Asigna perfil operacional a `Company`
4. Persiste `CompanySettings` (JSONB)
5. Materializa tipos de vehículo
6. Materializa métodos de pago
7. Crea lockers si configurados
8. Redimensiona capacidad
9. Crea tarifas desde onboarding (desactiva existentes)
10. Marca `OnboardingProgress.completed = true`
11. Marca `Company.onboardingCompleted = true`

### Omitir (Skip)

POST `/api/v1/onboarding/companies/{id}/skip`:

- Si hay datos parciales: construye settings con lo que exista + defaults
- Si no hay datos: aplica configuración por defecto completa
- Materializa vehicle types (MOTORCYCLE, CAR por defecto)
- Materializa payment methods (CASH por defecto)
- Crea tarifas por defecto (MOTORCYCLE: $1000, CAR: $2000)
- Marca como completado y omitido

### Reiniciar (Reset)

POST `/api/v1/onboarding/companies/{id}/reset?reason=...`:

**LO QUE HACE:**
1. Verifica permisos (solo ADMIN/SUPER_ADMIN de la misma empresa)
2. Cuenta sesiones activas (las registra en audit log)
3. Crea un **snapshot** de `CompanySettingsSnapshot` con:
   - settings_json actual
   - progress_data actual
   - versión secuencial (v1, v2, etc.)
   - razón del reinicio
   - usuario que lo inició
4. Marca `Company.onboardingCompleted = false`
5. **Invalida sesiones** de todos los usuarios de la empresa (excepto quien hizo el reset)
6. Resetea `OnboardingProgress`:
   - `completed = false`
   - `currentStep = 1`
7. Redirige al wizard desde el paso 1

**LO QUE NO HACE:**
- ❌ No elimina datos materializados (tarifas, métodos de pago, lockers ya creados permanecen)
- ❌ No elimina snapshots anteriores
- ❌ No afecta vehículos estacionados (solo los cuenta para audit)

### Re-ejecutar desde Configuración (OnboardingSection)

En `?section=onboarding` → botón "Ejecutar Parametrización Automática":

1. Pide confirmación al usuario
2. Llama `backupOnboardingConfig()` — guarda config actual en localStorage
3. Llama `resetOnboarding()` — reinicia el progreso (con snapshot)
4. Llama `restoreOnboardingConfig()` — restaura la config al nuevo progress_data
5. Refresca el token de sesión
6. Dispara evento `parkflow-refresh-runtime-config`
7. Recarga la página → redirige al wizard

---

## Persistencia en Base de Datos

### Tabla: `onboarding_progress`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `company_id` | UUID (FK, unique) | Una fila por empresa |
| `current_step` | int (default 1) | Paso actual |
| `completed` | boolean | Onboarding finalizado |
| `skipped` | boolean | Omitido |
| `progress_data` | JSONB | `{"step_1": {...}, "step_2": {...}, ...}` |
| `version` | bigint | Locking optimista |
| `created_at` / `updated_at` | timestamptz | Auditoría |

### Tabla: `company_settings`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `company_id` | UUID (FK, unique) | Una fila por empresa |
| `settings_json` | JSONB | Settings consolidados (ver estructura abajo) |
| `created_at` / `updated_at` | timestamptz | Auditoría |

### Tabla: `company_settings_snapshot`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `company_id` | UUID (FK) | |
| `version` | int | Versión secuencial del snapshot |
| `settings_json` | JSONB | Settings antes del reset |
| `progress_data` | JSONB | Progress antes del reset |
| `reason` | text | Razón del reinicio |
| `created_by` | text | Email de quien reinició |
| `created_at` | timestamptz | |

### Tabla: `onboarding_question_config`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `step_number` | int (unique) | 1-12 |
| `title` | varchar(200) | Título mostrado |
| `description` | varchar(500) | Descripción de ayuda |
| `enabled` | boolean | Paso activo |
| `required` | boolean | Paso obligatorio |
| `plan_restricted` | boolean | Restringido por plan |
| `created_at` / `updated_at` | timestamptz | |

### Estructura del settings_json (CompanySettings)

```json
{
  "plan": "PRO",
  "vehicleTypes": ["MOTORCYCLE", "CAR"],
  "paymentMethods": ["CASH", "NEQUI"],
  "sites": [{"code": "PRINCIPAL", "name": "Sede principal"}],
  "capacity": {"controlSlots": true, "total": 100, "byType": {...}},
  "rates": {
    "type": "HOURLY", "baseValue": 2000,
    "hasNightRate": true, "nightStartTime": "20:00", "nightEndTime": "06:00",
    "hasFractions": false, "rounding": "EXACT",
    "hasCourtesy": true, "graceMinutes": 5, ...
  },
  "region": {"countryCode": "CO", "platePattern": "ABC123", "platePrefix": ""},
  "tickets": {"printerType": "THERMAL", "allowReprint": true, ...},
  "shifts": {"enabled": true, "dayShiftStart": "06:00", ...},
  "agreements": {"enabled": true, "discount": 10},
  "operationConfiguration": {
    "defaultVehicleType": "CAR", "helmetHandling": "LOCKERS",
    "helmetTokenCount": 50, "countryCode": "CO", ...
  },
  "modules": {
    "cash": true, "shifts": true, "clients": true,
    "agreements": true, "advancedAudit": true
  },
  "features": {
    "agreements": true, "memberships": true, "motorcycleParking": true,
    "helmetControl": true, "lockerControl": true, "multiplePaymentMethods": true,
    "operation24Hours": false, "plateValidation": true, ...
  },
  "wizard": { "step_1": {...}, "step_2": {...}, ... }
}
```

---

## Tabla Resumen de Pasos

| Paso | Nombre | Obligatorio | Plan-Res. | Materializa | Configurable después |
|------|--------|-------------|-----------|-------------|---------------------|
| 1 | Tipos de vehículo | ✅ | ❌ | Vehicle types, lockers, perfil | Masters, Lockers, Cascos |
| 2 | Capacidad | ✅ | ❌ | ParkingSpace | Capacidad, Espacios |
| 3 | Tarifas | ✅ | ❌ | Rate | Tarifas, Fracciones |
| 4 | Caja / Región | ✅ | ❌ | — | Región, Cajas |
| 5 | Turnos | ❌ | ❌ | — | Turnos, Módulos |
| 6 | Métodos de pago | ✅ | ❌ | PaymentMethod | Métodos de pago |
| 7 | Tickets | ❌ | ❌ | — | Impresoras, Parámetros |
| 8 | Clientes | ❌ | ✅ | — | Módulos, Mensualidades |
| 9 | Convenios | ❌ | ✅ | — | Convenios, Módulos |
| 10 | Sedes | ❌ | ✅ | — | Sedes, Operación |
| 11 | Permisos | ❌ | ✅ | — | Usuarios |
| 12 | Auditoría | ❌ | ❌ | — | (solo lectura) |

---

## API Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/v1/onboarding/companies/{companyId}` | ADMIN/SUPER_ADMIN | Estado del onboarding |
| `PUT` | `/api/v1/onboarding/companies/{companyId}/steps` | ADMIN/SUPER_ADMIN | Guardar paso |
| `POST` | `/api/v1/onboarding/companies/{companyId}/skip` | ADMIN/SUPER_ADMIN | Omitir con defaults |
| `POST` | `/api/v1/onboarding/companies/{companyId}/complete` | ADMIN/SUPER_ADMIN | Finalizar onboarding |
| `POST` | `/api/v1/onboarding/companies/{companyId}/reset` | ADMIN/SUPER_ADMIN | Reiniciar (crea snapshot) |
| `GET` | `/api/v1/onboarding/companies/{companyId}/features/{key}/enabled` | ADMIN/SUPER_ADMIN | Verificar feature |
| `GET` | `/api/v1/onboarding/companies/{companyId}/settings` | Authenticated | Obtener settings |
| `GET` | `/api/v1/onboarding/companies/{companyId}/capabilities` | Authenticated | Obtener capacidades |

### Admin (configuración de preguntas)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/onboarding-questions` | SUPER_ADMIN | Listar configs |
| `GET` | `/api/v1/admin/onboarding-questions/enabled` | SUPER_ADMIN | Solo habilitadas |
| `POST` | `/api/v1/admin/onboarding-questions` | SUPER_ADMIN | Crear/actualizar |
| `PUT` | `/api/v1/admin/onboarding-questions/batch` | SUPER_ADMIN | Batch update |
| `DELETE` | `/api/v1/admin/onboarding-questions/{id}` | SUPER_ADMIN | Eliminar |
| `POST` | `/api/v1/admin/onboarding-questions/seed` | SUPER_ADMIN | Sembrar defaults |
