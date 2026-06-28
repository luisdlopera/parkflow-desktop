# Módulo de Configuración — ParkFlow

**Última actualización:** 2026-06-28
**Propósito:** Documentar todas las capacidades del módulo de configuración, su relación con el onboarding, y qué se puede hacer después de la parametrización inicial.

---

## Arquitectura General

El módulo de configuración es el centro de administración del sistema. A diferencia del onboarding (que es un wizard lineal de una sola vez), la configuración permite **gestión continua** de todos los aspectos operativos, de negocio y de personalización.

### Ubicación

| Capa | Ruta |
|------|------|
| **Backend Controllers** | `modules/configuration/infrastructure/controller/` (19 controllers) |
| **Backend Services** | `modules/configuration/application/service/` (24 services) |
| **Frontend Pages** | `app/(dashboard)/configuracion/` y sub-rutas dedicadas |
| **Frontend Components** | `features/configuration/components/` |
| **Frontend API** | `lib/api/` (archivos individuales por feature) |

---

## Secciones de Configuración

### 1. Configuración General (Setup Básico)

**Ruta:** `/configuracion?section=setup`
**Frontend:** `SetupBasicoTab.tsx` — 4 tabs internos

#### 1.1 Capacidad

| Acción | Endpoint | Método |
|--------|----------|--------|
| Ver capacidad | `/api/v1/configuration/capacity` | GET |
| Actualizar capacidad total | `/api/v1/configuration/capacity` | PATCH |

**Relación con onboarding:** Lo configurado en **Step 2** (Capacidad) se modifica aquí. Además, `/configuracion/espacios` permite gestión granular de cada espacio individual.

#### 1.2 Turnos

| Acción | Endpoint | Método |
|--------|----------|--------|
| Ver configuración | `/api/v1/configuration/shifts` | GET |
| Actualizar (horarios, enabled) | `/api/v1/configuration/shifts` | PATCH |

**Relación con onboarding:** Lo configurado en **Step 5** se modifica aquí.

#### 1.3 Región

| Acción | Endpoint | Método |
|--------|----------|--------|
| Ver configuración regional | `/api/v1/configuration/region` | GET |
| Actualizar (país, placa, timezone) | `/api/v1/configuration/region` | PATCH |

**Relación con onboarding:** Lo configurado en **Step 4** se modifica aquí.

#### 1.4 Cascos (Helmet Handling)

| Acción | Endpoint | Método |
|--------|----------|--------|
| Ver modo + stats lockers | `/api/v1/configuration/helmet-handling` | GET |
| Actualizar modo (NONE/MANUAL/LOCKERS) | `/api/v1/configuration/helmet-handling` | PATCH |

**Relación con onboarding:** Lo configurado en **Step 1** (helmetHandling) se modifica aquí.

---

### 2. Módulos (Feature Modules)

**Ruta:** `/configuracion?section=modules`
**Frontend:** `ModulesTab.tsx`

| Módulo | Toggle | Planes que lo permiten |
|--------|--------|----------------------|
| Clientes (`clientsEnabled`) | Switch | PRO, ENTERPRISE |
| Convenios (`agreementsEnabled`) | Switch | PRO, ENTERPRISE |
| Mensualidades (`monthlyEnabled`) | Switch | PRO, ENTERPRISE |
| Turnos (`shiftsEnabled`) | Switch | Todos |
| Caja (`cashEnabled`) | Switch | Todos |
| Auditoría avanzada (`advancedAuditEnabled`) | Switch | PRO, ENTERPRISE |

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Ver módulos activos | `/api/v1/configuration/modules` | GET |
| Actualizar módulos (según plan) | `/api/v1/configuration/modules` | PATCH |

**Relación con onboarding:** Los módulos se infieren de los pasos 5, 8, 9 del onboarding. Aquí se pueden ajustar manualmente, limitados por el plan de licencia.

---

### 3. Feature Flags (Características de Negocio)

**Ruta:** `/configuracion?section=onboarding` → Sección "Feature Flags"
**Frontend:** `FeatureFlagsSection.tsx` — 15 toggles en 5 categorías

#### Operación

| Feature | Key | Default |
|---------|-----|---------|
| Control de lockers | `lockerControl` | false |
| Control de cascos | `helmetControl` | false |
| Control de accesorios | `accessoryControl` | false |
| Reservas | `reservations` | false |
| Operación 24h | `operation24Hours` | false |

#### Facturación

| Feature | Key | Default |
|---------|-----|---------|
| Facturación electrónica | `electronicBilling` | false |
| Múltiples métodos de pago | `multiplePaymentMethods` | false |
| Tarifas especiales | `specialRates` | false |

#### Vehículos

| Feature | Key | Default |
|---------|-----|---------|
| Parqueadero de motos | `motorcycleParking` | true |
| Parqueadero de bicicletas | `bicycleParking` | false |

#### Clientes

| Feature | Key | Default |
|---------|-----|---------|
| Convenios | `agreements` | false |
| Prepago | `prepaid` | false |
| Membresías | `memberships` | false |
| Clientes frecuentes | `frequentCustomers` | false |

#### Seguridad

| Feature | Key | Default |
|---------|-----|---------|
| Validación de placas | `plateValidation` | true |

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Ver features | `/api/v1/configuration/features` | GET |
| Actualizar features | `/api/v1/configuration/features` | PATCH |

**Relación con onboarding:** Los features se derivan automáticamente de las respuestas del wizard:
- `agreements` → Step 9
- `memberships` → Step 8
- `motorcycleParking`, `bicycleParking` → Step 1 (vehicleTypes)
- `helmetControl`, `lockerControl` → Step 1 (helmetHandling)
- `multiplePaymentMethods` → Step 6 (cantidad de métodos)
- `operation24Hours` → Step 3 (hasNightRate / billingModel MIXED)

---

### 4. Tarifas

**Ruta:** `/configuracion?section=rates`
**Frontend:** `RatesSection.tsx` + `RateForm.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar tarifas | `/api/v1/configuration/rates` | GET |
| Ver tarifa | `/api/v1/configuration/rates/{id}` | GET |
| Crear tarifa | `/api/v1/configuration/rates` | POST |
| Actualizar tarifa | `/api/v1/configuration/rates/{id}` | PUT |
| Activar/desactivar tarifa | `/api/v1/configuration/rates/{id}/status` | PATCH |

**Filtros de listado:** site, q (texto), active, category, pageable

**Campos de una tarifa:**
- name, vehicleType, rateType (HOURLY/FRACTION/FLAT/FULL_DAY/MIXED)
- amount, graceMinutes, toleranceMinutes, fractionMinutes
- roundingMode, lostTicketSurcharge
- site, windowStart/End, scheduledActiveFrom/To

#### Fracciones de Tarifa

**Ruta:** `/configuracion/fracciones`
**Frontend:** `FraccionesPage.tsx`

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar fracciones por rateId | `/api/v1/configuration/rate-fractions` | GET |
| Ver fracción | `/api/v1/configuration/rate-fractions/{id}` | GET |
| Crear fracción | `/api/v1/configuration/rate-fractions` | POST |
| Actualizar fracción | `/api/v1/configuration/rate-fractions/{id}` | PUT |
| Eliminar fracción | `/api/v1/configuration/rate-fractions/{id}` | DELETE |

**Relación con onboarding:** Lo configurado en **Step 3** crea tarifas iniciales tipo HOURLY. Aquí se pueden crear, modificar o desactivar tarifas adicionales, cambiar el modelo de cobro, y gestionar fracciones.

---

### 5. Métodos de Pago

**Ruta:** `/configuracion/metodos-pago`
**Frontend:** `MetodosPagoPage.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar | `/api/v1/configuration/payment-methods` | GET |
| Ver | `/api/v1/configuration/payment-methods/{id}` | GET |
| Crear | `/api/v1/configuration/payment-methods` | POST |
| Actualizar | `/api/v1/configuration/payment-methods/{id}` | PUT |
| Activar/desactivar | `/api/v1/configuration/payment-methods/{id}/status` | PATCH |

**Catálogo base:** CASH, DEBIT_CARD, CREDIT_CARD, NEQUI, DAVIPLATA, TRANSFER, QR, AGREEMENT, MIXED

**Relación con onboarding:** Lo configurado en **Step 6** crea los métodos. Aquí se pueden agregar, eliminar o desactivar.

---

### 6. Sedes

**Ruta:** `/configuracion/sedes`
**Frontend:** `SedesPage.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar | `/api/v1/configuration/parking-sites` | GET |
| Ver | `/api/v1/configuration/parking-sites/{id}` | GET |
| Crear (requiere MULTI_LOCATION) | `/api/v1/configuration/parking-sites` | POST |
| Actualizar | `/api/v1/configuration/parking-sites/{id}` | PUT |
| Activar/desactivar | `/api/v1/configuration/parking-sites/{id}/status` | PATCH |

**Campos:** code, name, address, city, timezone, currency, max capacity

**Relación con onboarding:** Step 10 configura nombres de sedes para multi-sede. Aquí se crean/editan/eliminan sedes completas con todos sus campos.

---

### 7. Cajas (Cash Registers)

**Ruta:** `/configuracion/cajas`
**Frontend:** `CajasPage.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar | `/api/v1/configuration/cash-registers` | GET |
| Ver | `/api/v1/configuration/cash-registers/{id}` | GET |
| Crear | `/api/v1/configuration/cash-registers` | POST |
| Actualizar | `/api/v1/configuration/cash-registers/{id}` | PUT |
| Activar/desactivar | `/api/v1/configuration/cash-registers/{id}/status` | PATCH |

**Filtros de listado:** siteId, q, active

**Relación con onboarding:** Step 4 configura el número de terminales. Aquí se crean/editan cajas individuales asociadas a sedes, impresoras y usuarios responsables.

---

### 8. Impresoras

**Ruta:** `/configuracion/impresoras`
**Frontend:** `ImpresorasPage.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar | `/api/v1/configuration/printers` | GET |
| Ver | `/api/v1/configuration/printers/{id}` | GET |
| Crear (con siteId) | `/api/v1/configuration/printers` | POST |
| Actualizar | `/api/v1/configuration/printers/{id}` | PUT |
| Activar/desactivar | `/api/v1/configuration/printers/{id}/status` | PATCH |

**Tipos:** THERMAL, PDF, OS
**Conexiones:** USB, NET, BLUETOOTH, LOCAL_AGENT

**Relación con onboarding:** Step 7 configura el tipo de impresora. Aquí se gestionan dispositivos físicos por sede.

---

### 9. Usuarios

**Ruta:** `/configuracion?section=users`
**Frontend:** `UsersSection.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar | `/api/v1/configuration/users` | GET |
| Ver | `/api/v1/configuration/users/{id}` | GET |
| Crear | `/api/v1/configuration/users` | POST |
| Actualizar | `/api/v1/configuration/users/{id}` | PATCH |
| Activar/desactivar | `/api/v1/configuration/users/{id}/status` | PATCH |

**Roles disponibles:** SUPER_ADMIN, ADMIN, CAJERO, OPERADOR, AUDITOR

**Relación con onboarding:** No se configuran usuarios específicos en onboarding (solo el admin que crea la empresa). Aquí es donde se gestiona todo el equipo.

---

### 10. Parámetros del Sistema

**Ruta:** `/configuracion?section=parameters`
**Frontend:** `ParametersSection.tsx` — 30+ campos

Agrupados por categoría:

#### Información de la Empresa
- Nombre, NIT, régimen tributario

#### Configuración de Tickets
- Prefijo de ticket, formato, reimpresión

#### Facturación Electrónica (DIAN - Colombia)
- Configuración de facturación electrónica colombiana

#### Integración PSC
- Webhook de cierre de caja

#### Políticas de Caja
- Configuraciones específicas de caja por sede

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Obtener parámetros | `/api/v1/configuration/parameters` | GET |
| Actualizar parámetros | `/api/v1/configuration/parameters` | PUT |
| Resetear parámetros | `/api/v1/configuration/parameters/reset` | PUT |
| Validar parámetros | `/api/v1/configuration/parameters/validate` | ... |

**Relación con onboarding:** Algunos campos provienen de settings generados en onboarding. Aquí se gestionan en detalle.

---

### 11. Interfaz y Marca (Theme/Branding)

**Ruta:** `/configuracion?section=interface`
**Frontend:** `InterfaceSection.tsx` + `ThemeConfigSection.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Obtener tema | `/api/v1/configuration/theme` | GET |
| Actualizar tema (colores, modo) | `/api/v1/configuration/theme` | PUT |
| Subir logo | `/api/v1/configuration/theme/logo` | POST |
| Eliminar logo | `/api/v1/configuration/theme/logo` | DELETE |
| Subir favicon | `/api/v1/configuration/theme/favicon` | POST |
| Eliminar favicon | `/api/v1/configuration/theme/favicon` | DELETE |

**Campos editables:**
- 5 colores de marca: primary, secondary, success, warning, danger
- Modo de tema: light / dark / auto
- Logo (imagen)
- Favicon (imagen)

**Relación con onboarding:** No hay paso de onboarding para esto. Es configuración 100% post-onboarding.

---

### 12. Tipos de Vehículo (Maestros)

**Ruta:** `/configuracion?section=masters`
**Frontend:** `MastersSection.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar para compañía | `/api/v1/configuration/vehicle-types` | GET |
| Agregar tipo | `/api/v1/configuration/vehicle-types` | POST |
| Actualizar | `/api/v1/configuration/vehicle-types/{id}` | PUT |
| Eliminar de compañía | `/api/v1/configuration/vehicle-types/{id}` | DELETE |
| Activar/desactivar | `/api/v1/configuration/vehicle-types/{id}/status` | PATCH |

**Catálogo global:** MOTORCYCLE, CAR, BICYCLE, VAN, TRUCK, BUS, ELECTRIC, OTHER (más tipos personalizados)

**Relación con onboarding:** Step 1 selecciona tipos del catálogo. Aquí se pueden agregar más, cambiar icono/color, orden de visualización, etc.

---

### 13. Espacios (Parking Spaces)

**Ruta:** `/configuracion/espacios`
**Frontend:** `EspaciosPage.tsx`

**Funcionalidad:**
- Grid visual de espacios de parqueo
- Redimensionar capacidad total
- Marcar espacios como: ACTIVE, INACTIVE, MAINTENANCE
- Ver resumen de ocupación

**Relación con onboarding:** Step 2 configura la capacidad. Aquí se gestiona cada espacio individualmente.

---

### 14. Lockers

**Ruta:** `/configuracion/lockers`
**Frontend:** `LockersPage.tsx`

**Funcionalidad:**
- Crear lockers individuales o en batch (prefijo + rango numérico)
- Cambiar estado: DISPONIBLE, OCUPADO, FUERA_DE_SERVICIO
- Activar/desactivar
- Eliminar

**Gated por:** feature flag `lockers`

**Relación con onboarding:** Step 1 crea lockers si `helmetHandling === "LOCKERS"`. Aquí se gestionan.

---

### 15. Parámetros Operativos por Sede

**Ruta:** `/configuracion/operacion`
**Frontend:** `OperacionPage.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Obtener por siteId | `/api/v1/configuration/operational-parameters` | GET |
| Crear o actualizar | `/api/v1/configuration/operational-parameters` | PUT |

**Toggles por sede:**
- Entry sin impresora
- Exit sin pago
- Reimpresión de tickets
- Anulación
- Foto requerida
- Modo offline
- Tolerancia
- Tiempo sin cobro
- Mensaje legal en ticket

**Relación con onboarding:** No hay paso directo de onboarding. Estos son parámetros finos post-creación.

---

### 16. Contratos Mensuales

**Ruta:** `/configuracion?section=monthly`
**Frontend:** `MonthlySection.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar | `/api/v1/configuration/monthly-contracts` | GET |
| Ver | `/api/v1/configuration/monthly-contracts/{id}` | GET |
| Crear | `/api/v1/configuration/monthly-contracts` | POST |
| Actualizar | `/api/v1/configuration/monthly-contracts/{id}` | PUT |
| Activar/desactivar | `/api/v1/configuration/monthly-contracts/{id}/status` | PATCH |

**Creación automática:** Al crear un contrato mensual, se auto-crea el Customer y Vehicle si no existen.

**Relación con onboarding:** Step 8 activa el módulo de mensualidades. Aquí se gestionan los contratos.

---

### 17. Convenios Corporativos

**Ruta:** `/configuracion?section=agreements`
**Frontend:** `AgreementsSection.tsx`

**Endpoints:**

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar | `/api/v1/configuration/agreements` | GET |
| Ver | `/api/v1/configuration/agreements/{id}` | GET |
| Resolver por código | `/api/v1/configuration/agreements/resolve` | GET |
| Crear | `/api/v1/configuration/agreements` | POST |
| Actualizar | `/api/v1/configuration/agreements/{id}` | PUT |
| Activar/desactivar | `/api/v1/configuration/agreements/{id}/status` | PATCH |

**Campos:** descuento (porcentaje) o tarifa plana, empresa asociada

**Relación con onboarding:** Step 9 activa el módulo de convenios. Aquí se crean y gestionan.

---

### 18. Prepago

**Ruta:** `/configuracion?section=prepaid`
**Frontend:** `PrepaidSection.tsx`

#### Paquetes

| Acción | Endpoint | Método |
|--------|----------|--------|
| Listar paquetes | `/api/v1/configuration/prepaid/packages` | GET |
| Ver paquete | `/api/v1/configuration/prepaid/packages/{id}` | GET |
| Crear paquete | `/api/v1/configuration/prepaid/packages` | POST |
| Actualizar paquete | `/api/v1/configuration/prepaid/packages/{id}` | PUT |
| Activar/desactivar | `/api/v1/configuration/prepaid/packages/{id}/status` | PATCH |

#### Saldos

| Acción | Endpoint | Método |
|--------|----------|--------|
| Consultar saldo por placa | `/api/v1/configuration/prepaid/balance` | GET |
| Comprar saldo | `/api/v1/configuration/prepaid/balance/purchase` | POST |
| Descontar minutos | `/api/v1/configuration/prepaid/balance/{id}/deduct` | PATCH |

**Relación con onboarding:** No hay paso de onboarding para prepago. Se activa via feature flag.

---

### 19. Onboarding (Re-ejecución)

**Ruta:** `/configuracion?section=onboarding`
**Frontend:** `OnboardingSection.tsx` + `FeatureFlagsSection.tsx`

| Acción | Descripción |
|--------|-------------|
| Re-ejecutar wizard | Reinicia onboarding, preserva config manual, redirige al wizard |
| Feature flags | 15 toggles de negocio |

**Flujo de re-ejecución:**
1. `backupOnboardingConfig()` → guarda config actual en localStorage
2. `resetOnboarding()` → crea snapshot en DB, invalida sesiones, pone currentStep=1
3. `restoreOnboardingConfig()` → restaura la config respaldada en el nuevo progress
4. Refresca el token de sesión
5. Recarga la página → redirige al wizard

**⚠️ Importante:** El reset NO elimina datos materializados (tarifas, métodos de pago, lockers ya creados permanecen). Solo reinicia el progreso del wizard.

---

## API Completa: Todos los Endpoints

### Configuration Module (19 controllers)

| # | Controlador | Base Path | Endpoints |
|---|-------------|-----------|-----------|
| 1 | `ConfigurationRateController` | `/api/v1/configuration/rates` | GET list, GET {id}, POST, PUT {id}, PATCH {id}/status |
| 2 | `ConfigurationPaymentMethodController` | `/api/v1/configuration/payment-methods` | GET list, GET {id}, POST, PUT {id}, PATCH {id}/status |
| 3 | `ConfigurationParkingSiteController` | `/api/v1/configuration/parking-sites` | GET list, GET {id}, POST, PUT {id}, PATCH {id}/status |
| 4 | `ConfigurationRateFractionController` | `/api/v1/configuration/rate-fractions` | GET list, GET {id}, POST, PUT {id}, DELETE {id} |
| 5 | `ConfigurationVehicleTypeController` | `/api/v1/configuration/vehicle-types` | GET list, POST, PUT {id}, DELETE {id}, PATCH {id}/status |
| 6 | `ConfigurationCashRegisterController` | `/api/v1/configuration/cash-registers` | GET list, GET {id}, POST, PUT {id}, PATCH {id}/status |
| 7 | `ConfigurationPrinterController` | `/api/v1/configuration/printers` | GET list, GET {id}, POST, PUT {id}, PATCH {id}/status |
| 8 | `ConfigurationUserController` | `/api/v1/configuration/users` | GET list, GET {id}, POST, PATCH {id}, PATCH {id}/status |
| 9 | `ConfigurationOperationalParameterController` | `/api/v1/configuration/operational-parameters` | GET, PUT |
| 10 | `ThemeConfigurationController` | `/api/v1/configuration/theme` | GET, PUT, POST logo, DELETE logo, POST favicon, DELETE favicon |
| 11 | `ConfigurationMonthlyContractController` | `/api/v1/configuration/monthly-contracts` | GET list, GET {id}, POST, PUT {id}, PATCH {id}/status |
| 12 | `ConfigurationAgreementController` | `/api/v1/configuration/agreements` | GET list, GET {id}, GET resolve, POST, PUT {id}, PATCH {id}/status |
| 13 | `ConfigurationPrepaidController` | `/api/v1/configuration/prepaid` | packages CRUD, balance get/purchase/deduct |
| 14 | `CapacityManagementController` | `/api/v1/configuration/capacity` | GET, PATCH |
| 15 | `ShiftConfigurationController` | `/api/v1/configuration/shifts` | GET, PATCH |
| 16 | `HelmetHandlingController` | `/api/v1/configuration/helmet-handling` | GET, PATCH |
| 17 | `RegionConfigurationController` | `/api/v1/configuration/region` | GET, PATCH |
| 18 | `ModuleConfigurationController` | `/api/v1/configuration/modules` | GET, PATCH |
| 19 | `FeatureConfigurationController` | `/api/v1/configuration/features` | GET, PATCH |

---

## Navegación Frontend

### Menú de Configuración

Agrupado en 6 categorías con 15 ítems:

| Grupo | Items | Rutas |
|-------|-------|-------|
| **Administración** | General, Usuarios, Parámetros, Interfaz, Maestros, Asistente Inicial | `?section=setup\|users\|parameters\|interface\|masters\|onboarding` |
| **Organización** | Sedes, Cajas | `/configuracion/sedes`, `/configuracion/cajas` |
| **Operación** | Operación | `/configuracion/operacion` |
| **Cobro** | Métodos de pago, Fracciones, Convenios, Prepagados | `/configuracion/metodos-pago`, `/configuracion/fracciones`, `?section=agreements\|prepaid` |
| **Infraestructura** | Impresoras | `/configuracion/impresoras` |
| **Estacionamiento** | Espacios, Lockers | `/configuracion/espacios`, `/configuracion/lockers` |

---

## Servicios Backend (24)

| Servicio | Puerto de entrada | Métodos clave |
|----------|------------------|---------------|
| `PaymentMethodManagementService` | `PaymentMethodUseCase` | list, get, create, update, patchStatus |
| `ParkingSiteManagementService` | `ParkingSiteUseCase` | list, get, create, update, patchStatus |
| `PrinterManagementService` | `PrinterUseCase` | list, get, create, update, patchStatus |
| `CashRegisterManagementService` | `CashRegisterUseCase` | list, get, create, update, patchStatus |
| `RateFractionManagementService` | `RateFractionUseCase` | listByRate, get, create, update, delete |
| `CapacityManagementServiceImpl` | `CapacityManagementUseCase` | getCapacity, updateCapacity |
| `ShiftConfigurationServiceImpl` | `ShiftConfigurationUseCase` | get, update |
| `HelmetHandlingServiceImpl` | `HelmetHandlingUseCase` | get, update |
| `RegionConfigurationServiceImpl` | `RegionConfigurationUseCase` | get, update |
| `ModuleConfigurationServiceImpl` | `ModuleConfigurationUseCase` | get, update |
| `FeatureConfigurationServiceImpl` | `FeatureConfigurationUseCase` | get, update |
| `ThemeColorManagementService` | `ThemeConfigurationUseCase` | get, createOrUpdate, logo CRUD, favicon CRUD |
| `ThemeAssetManagementService` | — | Logo/favicon file operations |
| `OperationalParameterManagementService` | `OperationalParameterUseCase` | getBySite, createOrUpdate |
| `MonthlyContractService` | — | list, get, create, update, patchStatus |
| `AgreementService` | — | list, get, create, update, patchStatus, resolveByCode |
| `AgreementManagementService` | — | Management helper |
| `AgreementQueryService` | — | Query helper |
| `PrepaidService` | — | packages CRUD, balance get/purchase/deduct |
| `PrepaidManagementService` | — | Management helper |
| `PrepaidQueryService` | — | Query helper |
| `OperationalConfigurationService` | `OperationalValidationUseCase` | getOperationalProfile, getOperationConfiguration |
| `ConfigurationSyncService` | — | syncConfigurationToProgress (puente con onboarding) |
| `OnboardingDefaultsManagementService` | — | Defaults de onboarding |

---

## Matriz: Onboarding ↔ Configuración

### Qué se puede cambiar después del onboarding

| Aspecto | Onboarding (Step) | Configuración (Sección) |
|---------|-------------------|------------------------|
| Tipos de vehículo | Step 1 | Masters (`?section=masters`) |
| Manejo de cascos | Step 1 | Setup → Cascos |
| Lockers | Step 1 | `/configuracion/lockers` |
| Capacidad total | Step 2 | Setup → Capacidad |
| Capacidad por espacio | Step 2 | `/configuracion/espacios` |
| Modelo de tarifa | Step 3 | Tarifas (`?section=rates`) |
| Fracciones de tarifa | Step 3 | `/configuracion/fracciones` |
| País / región | Step 4 | Setup → Región |
| Prefijo de placa | Step 4 | Setup → Región |
| Terminales / cajas | Step 4 | `/configuracion/cajas` |
| Caja por operador | Step 4 | Setup + Módulos |
| Turnos (enable/disable) | Step 5 | Setup → Turnos |
| Horarios de turnos | Step 5 | Setup → Turnos |
| Métodos de pago | Step 6 | `/configuracion/metodos-pago` |
| Tipo de impresora | Step 7 | `/configuracion/impresoras` |
| Prefijo de ticket | Step 7 | Parámetros (`?section=parameters`) |
| Módulo clientes | Step 8 | Módulos (`?section=modules`) |
| Módulo convenios | Step 9 | Módulos (`?section=modules`) |
| Descuento convenios | Step 9 | Convenios (`?section=agreements`) |
| Multi-sede | Step 10 | Sedes (`/configuracion/sedes`) |
| Permisos avanzados | Step 11 | Usuarios (`?section=users`) |
| Feature flags | (inferido de varios) | Feature Flags (`?section=onboarding`) |
| Tema / marca | (ninguno) | Interfaz (`?section=interface`) |
| Parámetros del sistema | (ninguno) | Parámetros (`?section=parameters`) |
| Convenios corporativos | (ninguno directo) | Convenios (`?section=agreements`) |
| Prepago | (ninguno) | Prepago (`?section=prepaid`) |
| Contratos mensuales | (ninguno directo) | Mensualidades (`?section=monthly`) |
| Parámetros operativos | (ninguno) | `/configuracion/operacion` |

### Qué es EXCLUSIVO de onboarding (no cambiable después)

| Aspecto | Razón |
|---------|-------|
| Plan de licencia (LOCAL/SYNC/PRO/ENTERPRISE) | Se asigna al crear la compañía, ligado a licencia |
| Perfil operacional (Public/Residential/Enterprise) | Se infiere de tipos de vehículo, no se edita directamente |
| Skip del wizard (omitir) | Solo disponible en el flujo inicial |
| Progresión secuencial de pasos | El onboarding tiene máquina de estados; config es libre |
| Estados de progreso (currentStep, completed) | Solo relevantes durante el wizard |

---

## Sincronización Bidireccional (ConfigurationSyncService)

El servicio `ConfigurationSyncService` mantiene consistencia entre configuración y onboarding:

- Cuando se cambia algo en configuración post-onboarding, se sincroniza de vuelta al `progressData` del onboarding
- Esto permite que si el wizard se re-ejecuta, los datos estén actualizados
- Resuelve el Hallazgo #10 del sistema (inconsistencia entre wizard y config real)

---

## Patrón de Almacenamiento

La configuración se almacena de dos formas:

### 1. Tablas Dedicadas (entidades JPA)

| Recurso | Tabla |
|---------|-------|
| PaymentMethod | `payment_methods` |
| ParkingSite | `parking_sites` |
| Printer | `printers` |
| CashRegister | `cash_registers` |
| Rate | `rates` |
| RateFraction | `rate_fractions` |
| VehicleType (catálogo) | `vehicle_types` |
| CompanyVehicleType | `company_vehicle_types` |
| ThemeConfiguration | `theme_configurations` |
| MonthlyContract | `monthly_contracts` |
| Agreement | `agreements` |
| PrepaidPackage | `prepaid_packages` |
| PrepaidBalance | `prepaid_balances` |
| OperationalParameter | `operational_parameters` |

### 2. JSON Blob en Company / CompanySettings

Los settings "livianos" (capacity, shifts, region, helmet, modules, features) se almacenan como JSON en `company_settings.settings_json` o en la entidad `Company` directamente. Esto permite flexibilidad sin crear tablas nuevas.

---

## Roles y Permisos

| Endpoint | SUPER_ADMIN | ADMIN | OPERADOR | AUDITOR | CAJERO |
|----------|:-----------:|:-----:|:--------:|:-------:|:------:|
| rates (GET) | ✅ | ✅ | ✅ | ✅ | ❌ |
| rates (POST/PUT/PATCH) | ✅ | ✅ | ❌ | ❌ | ❌ |
| payment-methods (GET) | ✅ | ✅ | ✅ | ✅ | ❌ |
| payment-methods (POST/PUT/PATCH) | ✅ | ✅ | ❌ | ❌ | ❌ |
| parking-sites (GET) | ✅ | ✅ | ✅ | ✅ | ❌ |
| parking-sites (POST/PUT/PATCH) | ✅ | ✅ | ❌ | ❌ | ❌ |
| users (GET) | ✅ | ✅ | ✅ | ✅ | ❌ |
| users (POST/PATCH) | ✅ | ✅ | ❌ | ❌ | ❌ |
| theme (GET) | ✅ | ✅ | ✅ | ✅ | ✅ |
| theme (PUT/POST/DELETE) | ✅ | ✅ | ❌ | ❌ | ❌ |
| vehicle-types (GET) | ✅ | ✅ | ✅ | ✅ | ✅ |
| vehicle-types (POST/PUT/DELETE) | ✅ | ✅ | ❌ | ❌ | ❌ |
| prepaid/balance (GET) | ✅ | ✅ | ✅ | ✅ | ✅ |
| prepaid/balance/purchase | ✅ | ✅ | ❌ | ❌ | ✅ |
| prepaid/balance/deduct | ✅ | ✅ | ❌ | ❌ | ✅ |
| capacity (GET) | ✅ | ✅ | ✅ | ✅ | ❌ |
| capacity (PATCH) | ✅ | ✅ | ❌ | ❌ | ❌ |
| shifts/region/helmet/modules/features | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Consideraciones Técnicas

### RLS (Row-Level Security)
Todas las tablas de configuración multi-tenant tienen políticas RLS que filtran automáticamente por `company_id`. Cada request configura `app.tenant_id` vía JWT.

### Auditoría
Los cambios de configuración se registran via `AuditService.record()` con `AuditAction.CAMBIAR_CONFIGURACION`.

### Deprecación de Settings
Anteriormente existía `/api/v1/settings/*` que fue deprecado en favor de `/api/v1/configuration/*`. Ambos endpoints coexisten durante la transición.

### Endpoints Deprecados
6 servicios de configuración están marcados `@Deprecated(since="2.0")`: `CapacityManagementServiceImpl`, `ShiftConfigurationServiceImpl`, `HelmetHandlingServiceImpl`, `RegionConfigurationServiceImpl`, `ModuleConfigurationServiceImpl`, `FeatureConfigurationServiceImpl`. Redirigen a `CompanyConfigurationFacadeService` para nuevo código.
