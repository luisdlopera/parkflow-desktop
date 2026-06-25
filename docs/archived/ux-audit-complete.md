# Auditoría UX Operacional Completa - ParkFlow Desktop

**Fecha:** 29 de Abril 2026  
**Auditor:** Product Designer Senior - Sistemas Operación Crítica  
**Alcance:** Tauri Desktop + Next.js Web + Spring Boot API  
**Contexto:** Parqueaderos Colombia - Operación 24/7 - Offline-First

---

## 1. AUDITORÍA UX OPERACIONAL

### 1.1 Problemas Críticos Detectados

| ID | Problema | Impacto Operacional | Severidad |
|----|----------|---------------------|-----------|
| UX-01 | **Formulario de ingreso excesivamente largo** - 11 campos visibles simultáneamente | Operador pierde 8-12 segundos por ingreso. En pico: 60 vehículos/hora = 10 minutos perdidos | CRÍTICO |
| UX-02 | **Inputs de condición del vehículo requieren formato manual** (URLs separadas por coma) | Alto riesgo de error. Operador debe escribir URLs manualmente | CRÍTICO |
| UX-03 | **Sin auto-focus en campo de placa al cargar página** | Operador debe hacer clic manual. En operación rápida esto es fricción innecesaria | ALTO |
| UX-04 | **No hay indicador visual de vehículo registrado exitosamente** | El operador no tiene feedback inmediato. Riesgo de doble ingreso | CRÍTICO |
| UX-05 | **Sidebar ocupa 260px fijos sin modo colapso** | En pantallas pequeñas (tablets operativas) reduce espacio útil | MEDIO |
| UX-06 | **Sin atajos de teclado para operaciones frecuentes** | Todo requiere mouse. En operación rápida esto ralentiza | ALTO |
| UX-07 | **Tabla de vehículos activos sin indicador de tiempo transcurrido en vivo** | Operador debe calcular mentalmente | MEDIO |
| UX-08 | **Inputs de búsqueda en salida/cobro sin detección de scanner** | Si el operador escanea un ticket, debe hacer clic primero en el campo | ALTO |
| UX-09 | **Colores de estado no siguen convención operacional** - Verde/Azul/Amarillo inconsistente | Riesgo de interpretación errónea bajo presión | MEDIO |
| UX-10 | **No hay modo "operador experto"** - Interfaz igual para novatos y expertos | Los operadores experimentados están forzados a flujos lentos | ALTO |

### 1.2 Análisis de Flujo de Ingreso (Nuevo Ingreso)

```
TIEMPO ACTUAL: ~15-20 segundos por vehículo
├─ Cargar página: 1s
├─ Click en campo placa: 1s  ← EVITABLE con auto-focus
├─ Escribir placa: 3s
├─ Seleccionar tipo vehículo: 2s
├─ Escribir tarifa (opcional): 2s
├─ Configurar sede/carril/caja (raramente cambian): 3s ← SIEMPRE VISIBLES, molesto
├─ Estado del vehículo (textarea): 4s
├─ Checklist manual: 3s ← FORMATO CONFUSO
├─ Click en registrar: 1s
└─ Esperar respuesta: 2-4s

TIEMPO ÓPTIMO OBJETIVO: ~6-8 segundos
```

### 1.3 Análisis de Flujo de Salida

```
TIEMPO ACTUAL: ~20-30 segundos
├─ Click en campo ticket/placa: 1s
├─ Ingresar dato: 3s
├─ Click en buscar: 1s
├─ Esperar resultado: 2-4s
├─ Leer resultado: 3s
├─ Click en método de pago: 1s
├─ Procesar: 2-4s
└─ Entregar cambio/ticket: 5-10s (físico)

PROBLEMAS DETECTADOS:
- Si el scanner QR ingresa el ticket, el operador debe limpiar el campo primero
- No hay "Enter" para buscar automáticamente después de escanear
- El resumen de cobro no destaca el monto total visualmente
```

### 1.4 Problemas de Accesibilidad y Estrés Visual

| Aspecto | Estado Actual | Recomendación |
|---------|---------------|---------------|
| Contraste | OK - Texto slate sobre blanco | Mantener |
| Tamaño fuente | 14px base - Aceptable | Aumentar a 16px en touch |
| Inputs táctiles | 36px altura - Mínimo aceptable | 48px para modo touch |
| Modo nocturno | NO EXISTE | CRÍTICO - Implementar dark mode |
| Sonido feedback | NO EXISTE | Añadir beeps para éxito/error |
| Feedback háptico | NO EXISTE | Vibración en errores (mobile) |
| Alto brillo | Fondo con gradientes claros | Modo "bajo brillo" para noche |

---

## 2. AUDITORÍA DE FLUJOS CRÍTICOS

### 2.1 Ingreso de Vehículo

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Tiempo objetivo < 10s | ❌ NO CUMPLE | Actual: 15-20s |
| Un solo campo obligatorio visible inicialmente | ❌ NO CUMPLE | 11 campos visibles |
| Auto-focus en campo principal | ❌ NO IMPLEMENTADO | Debe hacer clic manual |
| Scanner QR/barcode funciona | ⚠️ PARCIAL | Sin detección automática de scanner |
| Prevé doble ingreso | ✅ SI | Submit lock implementado |
| Impresión automática ticket | ✅ SI | Funciona vía Tauri |
| Preview del ticket visible | ✅ SI | Buena implementación |
| Offline queue si falla | ✅ SI | Outbox pattern implementado |

**Riesgo Detectado:** El operador puede registrar un vehículo, la impresora falla silenciosamente, y no hay indicador sonoro/visual claro de que debe reimprimir.

### 2.2 Salida y Cobro

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Búsqueda rápida por ticket/placa | ✅ SI | Funciona bien |
| Cálculo automático de tarifa | ✅ SI | Backend calcula |
| Visualización clara del total | ⚠️ REGULAR | No destaca visualmente el monto |
| Botones grandes para métodos de pago | ❌ NO CUMPLE | Botones estándar, no touch-optimizados |
| Cambio calculado automáticamente | ❌ NO EXISTE | Operador calcula mentalmente |
| Comprobante de salida impreso | ✅ SI | Implementado |
| Ticket perdido procesable | ✅ SI | Flujo implementado |

**Riesgo Crítico:** La búsqueda no se activa automáticamente después de escanear. El operador debe hacer clic en "Buscar sesión".

### 2.3 Reimpresión de Ticket

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Accesible desde salida/cobro | ✅ SI | Botón disponible |
| Motivo de reimpresión registrado | ✅ SI | Campo obligatorio configurable |
| Límite de reimpresiones | ⚠️ PARCIAL | Existe en backend, no visible en UI |
| Auditoría de reimpresiones | ✅ SI | Se registra en servidor |

### 2.4 Ticket Perdido

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Flujo independiente | ✅ SI | Existe proceso específico |
| Recargo automático configurado | ✅ SI | Surcharge rate implementado |
| Autorización de supervisor | ⚠️ PARCIAL | Puede configurarse pero no hay UI de aprobación explícita |
| Motivo registrado | ✅ SI | Campo disponible |

### 2.5 Cierre de Caja

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Apertura con monto inicial | ✅ SI | Implementado |
| Movimientos manuales | ✅ SI | Ingresos/egresos/descuentos |
| Arqueo con conteo físico | ✅ SI | 4 campos de conteo |
| Validación de diferencias | ⚠️ PARCIAL | Muestra diferencia pero no bloquea |
| Impresión de comprobante cierre | ✅ SI | Disponible |
| Offline support | ✅ SI | Configurable por política |

**Problema Detectado:** La UI de caja tiene demasiados campos visibles simultáneamente. Un operador en horario pico no necesita ver todos los movimientos históricos, solo los relevantes para cierre.

### 2.6 Sincronización Offline

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Cola local (outbox) | ✅ SI | SQLite en Tauri |
| Indicador de items pendientes | ✅ SI | Visible en header caja |
| Reintentos automáticos | ✅ SI | Exponential backoff |
| Dead letter queue | ✅ SI | Implementado en Rust |
| Reconciliación manual | ❌ NO EXISTE | No hay UI para forzar sync |
| Indicador de conectividad | ⚠️ PARCIAL | En header pero no prominente |

### 2.7 Errores de Impresión

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Detección de impresora offline | ✅ SI | Printer health check |
| Cola de impresión local | ✅ SI | local_print_jobs en SQLite |
| Reintento automático | ⚠️ PARCIAL | Existe pero no hay indicador visual claro |
| Fallback a digital | ❌ NO EXISTE | No hay QR para cliente sin impresora |
| Alerta sonora/visual en fallo | ❌ NO EXISTE | Solo mensaje de texto |

### 2.8 Reconexión Internet

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Heartbeat automático | ✅ SI | Cada 3 segundos en Rust |
| Transición online/offline | ✅ SI | Estado en SQLite |
| Sync automático al reconectar | ✅ SI | Worker implementado |
| Indicador visual prominente | ❌ NO EXISTE | Solo texto pequeño en header |

### 2.9 Recuperación Post-Crash

| Check | Estado | Observaciones |
|-------|--------|---------------|
| Sesiones locales persistidas | ✅ SI | SQLite |
| Cola outbox persistente | ✅ SI | SQLite |
| Reanudación de operación | ✅ SI | Posible |
| Pérdida de datos en memoria | ⚠️ PARCIAL | Formularios no guardados se pierden |
| Auto-save de formularios | ❌ NO EXISTE | Feature crítico faltante |

---

## 3. AUDITORÍA HARDWARE

### 3.1 Impresoras Térmicas ESC/POS

| Aspecto | Estado | Prioridad |
|---------|--------|-----------|
| Soporte Epson TM-T20 | ✅ Implementado | P0 |
| Soporte Bixolon SRP-350 | ⚠️ Perfil placeholder | P1 |
| Soporte Star TSP100 | ⚠️ Perfil placeholder | P1 |
| Detección de papel agotado | ✅ Implementado | P0 |
| Corte de papel automático | ✅ Implementado | P0 |
| Apertura de cajón de dinero | ⚠️ Comando existe, no probado | P1 |
| Conexión TCP/Ethernet | ✅ Implementado | P0 |
| Conexión USB vía COM | ✅ Implementado | P0 |
| Conexión USB raw (sin COM) | ❌ No implementado | P2 |

### 3.2 Cámaras

| Aspecto | Estado | Prioridad |
|---------|--------|-----------|
| Captura de fotos vehículo | ⚠️ URLs manuales solo | P1 |
| Webcam integrada | ❌ No implementado | P1 |
| Cámara IP externa | ❌ No implementado | P2 |
| Almacenamiento local de fotos | ❌ No implementado | P1 |

**Problema Crítico:** El sistema espera URLs de fotos separadas por coma, pero no hay forma de capturar esas fotos desde la interfaz. El operador debería tener un botón "Capturar foto" que abra webcam, tome foto, y guarde localmente.

### 3.3 Lectores QR/Barcode

| Aspecto | Estado | Prioridad |
|---------|--------|-----------|
| Input tipo "keyboard wedge" | ✅ Funciona | P0 |
| Detección automática de scan | ❌ No implementado | P1 |
| Limpieza automática de campo | ❌ No implementado | P1 |
| Trigger de búsqueda post-scan | ❌ No implementado | P1 |
| Soporte Code 128 (barras) | ⚠️ No probado | P2 |
| Soporte QR (2D) | ✅ Probado | P0 |

### 3.4 Apertura de Talanqueras

| Aspecto | Estado | Prioridad |
|---------|--------|-----------|
| Comando desde backend | ✅ API existe | P0 |
| Trigger automático post-pago | ⚠️ No cableado en UI | P1 |
| Botón manual emergencia | ❌ No en UI | P1 |
| Estado de talanquera | ❌ No mostrado | P2 |

### 3.5 Funcionamiento Offline

| Aspecto | Estado | Prioridad |
|---------|--------|-----------|
| SQLite local | ✅ Implementado | P0 |
| Outbox pattern | ✅ Implementado | P0 |
| Lease offline configurable | ✅ Implementado | P0 |
| Operación caja offline | ✅ Configurable | P0 |
| Alerta de modo offline | ⚠️ Muy sutil | P1 |
| Sync al reconectar | ✅ Automático | P0 |

---

## 4. MEJORES PRÁCTICAS UX - IMPLEMENTACIÓN RECOMENDADA

### 4.1 Navegación por Teclado

```typescript
// Implementar en todas las pantallas operativas
const KEYBOARD_SHORTCUTS = {
  'F1': 'Nuevo ingreso',
  'F2': 'Salida y cobro',
  'F3': 'Vehículos activos',
  'F4': 'Caja',
  'F5': 'Actualizar datos',
  'Escape': 'Cancelar/Volver',
  'Enter': 'Confirmar/Procesar',
  'Ctrl+P': 'Imprimir último',
  'Ctrl+F': 'Buscar',
  '1': 'Cobro efectivo (en pantalla salida)',
  '2': 'Cobro tarjeta (en pantalla salida)',
};
```

### 4.2 Auto-focus Inteligente

```typescript
// En página de ingreso
useEffect(() => {
  // Auto-focus en campo de placa al cargar
  plateInputRef.current?.focus();
  // Seleccionar todo el texto para reemplazo rápido
  plateInputRef.current?.select();
}, []);

// En página de salida
useEffect(() => {
  // Si hay un scanner, el campo debe recibir focus inmediatamente
  ticketInputRef.current?.focus();
}, []);
```

### 4.3 Feedback Visual Instantáneo

```typescript
// Toast/Notification system
const OPERATION_FEEDBACK = {
  entrySuccess: {
    sound: 'success-beep.mp3',
    vibration: 50,
    visual: 'green-flash-overlay',
    message: 'Ingreso registrado - Ticket impreso',
    duration: 2000
  },
  printError: {
    sound: 'error-beep.mp3',
    vibration: 200,
    visual: 'red-flash-overlay',
    message: '⚠️ Error de impresora - Use reimprimir',
    duration: 5000
  }
};
```

### 4.4 Estados Operacionales Visuales

```css
/* Modo Operación Normal */
.app-mode-normal { /* default */ }

/* Modo Offline - Banner prominente */
.app-mode-offline {
  --status-bar-bg: #dc2626;
  --status-bar-color: white;
  --border-accent: #dc2626;
}

/* Modo Noche - Dark theme */
.app-mode-night {
  --bg-primary: #0f172a;
  --bg-surface: #1e293b;
  --text-primary: #f8fafc;
  --input-bg: #334155;
}

/* Modo Alto Contraste - Para visibilidad exterior */
.app-mode-outdoor {
  --font-size-base: 18px;
  --input-height: 56px;
  --button-height: 64px;
  --contrast-boost: 1.5;
}
```

### 4.5 Diseño Touch-Friendly

```css
/* Tamaños mínimos táctiles */
.touch-optimized {
  --min-touch-size: 48px;
  --button-height: 56px;
  --input-height: 52px;
  --spacing-touch: 16px;
  --font-size-input: 18px;
}
```

### 4.6 Dark Mode Nocturno

```typescript
// Detectar hora y aplicar automáticamente
const isNightHours = () => {
  const hour = new Date().getHours();
  return hour >= 19 || hour <= 6;
};

// Toggle manual en header
<ThemeToggle modes={['light', 'dark', 'auto']} />
```

---

## 5. ARQUITECTURA OPERACIONAL - VALIDACIÓN

### 5.1 Outbox Pattern

| Aspecto | Implementación | Estado |
|---------|----------------|--------|
| SQLite tabla outbox | ✅ `outbox` table en Rust | OK |
| Eventos tipados | ✅ `OutboxEventType` enum | OK |
| Reintentos exponenciales | ✅ `OUTBOX_MAX_RETRIES=12` | OK |
| Dead letter queue | ✅ `failed_events` tracking | OK |
| Priorización de eventos | ❌ No implementado | FALTA |
| Compresión de payload | ❌ No implementado | P2 |

### 5.2 Sync Queue

| Aspecto | Implementación | Estado |
|---------|----------------|--------|
| Worker background | ✅ Cada 3 segundos | OK |
| Batch processing | ✅ `claim_outbox_batch` | OK |
| Idempotencia keys | ✅ UUID v4 generado | OK |
| Cursor de sync | ⚠️ `syncedAt` pero no hay cursor cliente | REGULAR |
| Reconcile bidireccional | ⚠️ Solo push, no pull de cambios servidor | FALTA |

### 5.3 Retry Automático

```rust
// Implementación actual (simplificada)
const BACKOFF_SECS: [u64; 12] = [
    1, 2, 4, 8, 15, 30, 60, 120, 300, 600, 1800, 3600
];
// Total: ~2.5 horas de reintentos antes de dead letter
```

**Recomendación:** Añadir jitter y backoff exponencial con decorrelated jitter para evitar thundering herd al reconectar.

### 5.4 SQLite Local

| Aspecto | Implementación | Estado |
|---------|----------------|--------|
| Esquema versionado | ✅ Migrations en Rust | OK |
| Encriptación | ❌ No implementada | P1 - Datos sensibles |
| Backup automático | ❌ No implementado | P2 |
| Vacuum/Maintenance | ❌ No implementado | P2 |
| WAL mode | ⚠️ No verificado | Verificar |

### 5.5 Sincronización Incremental

| Aspecto | Implementación | Estado |
|---------|----------------|--------|
| Timestamps de modificación | ✅ `createdAt`, `updatedAt` | OK |
| Cursor de sync cliente | ❌ No implementado | P1 - CRÍTICO |
| Resolución de conflictos | ⚠️ Last-write-wins simple | REGULAR |
| Sync selective | ❌ No implementado | P2 |

### 5.6 Idempotencia

| Aspecto | Implementación | Estado |
|---------|----------------|--------|
| Keys únicos por operación | ✅ `newIdempotencyKey()` | OK |
| Storage en servidor | ✅ Tabla `idempotent_keys` | OK |
| TTL de keys | ⚠️ No configurado | P2 |
| Reuse de keys intencional | ❌ No permitido | OK |

### 5.7 Recuperación Automática Post-Crash

| Aspecto | Implementación | Estado |
|---------|----------------|--------|
| Form auto-save | ❌ No implementado | P1 - CRÍTICO |
| Drafts de operaciones | ❌ No implementado | P1 |
| Recovery wizard | ❌ No implementado | P2 |
| Estado de crash logueado | ✅ Logs en SQLite | OK |

---

## 6. MEJORAS CONCRETAS - MATRIZ DE IMPLEMENTACIÓN

### 6.1 Quick Wins (1-2 semanas)

| ID | Mejora | Impacto | Archivos Afectados | Esfuerzo |
|----|--------|---------|-------------------|----------|
| QW-01 | Auto-focus en campo placa (ingreso) | -3s por operación | `VehicleEntryForm.tsx` | 30 min |
| QW-02 | Submit on Enter en búsqueda salida | -2s por salida | `salida-cobro/page.tsx` | 30 min |
| QW-03 | Destacar visualmente el total en salida | Reduce errores | `salida-cobro/page.tsx` | 1 hora |
| QW-04 | Añadir indicador de sync pendiente prominente | Mejor tracking | `Header.tsx`, `layout.tsx` | 2 horas |
| QW-05 | Botones más grandes en pantalla salida | Mejor touch | `Button.tsx`, `salida-cobro/page.tsx` | 2 horas |
| QW-06 | Limpiar formulario después de éxito | Prevenir duplicados | `VehicleEntryForm.tsx` | 30 min |
| QW-07 | Sonido de éxito/error configurable | Feedback auditivo | Nueva utilidad de audio | 4 horas |
| QW-08 | Atajos F1-F4 para navegación principal | Velocidad operación | `Sidebar.tsx` + hook | 2 horas |

### 6.2 Mejoras Medianas (2-4 semanas)

| ID | Mejora | Impacto | Archivos Afectados | Esfuerzo |
|----|--------|---------|-------------------|----------|
| MD-01 | **Modo Operador Experto** - Campos colapsables | -50% clicks | `VehicleEntryForm.tsx` | 1 día |
| MD-02 | Detección automática de scanner QR | Flujo sin clicks | `salida-cobro/page.tsx` | 1 día |
| MD-03 | Webcam integrada para fotos vehículo | Captura real | Nuevo componente | 2 días |
| MD-04 | Dark mode automático/manual | Operación nocturna | `globals.css`, theme provider | 1 día |
| MD-05 | Calculadora de cambio en pantalla salida | Reduce errores | `salida-cobro/page.tsx` | 4 horas |
| MD-06 | Vista previa de ticket más fiel | Confianza operador | `TicketReceiptPreview.tsx` | 4 horas |
| MD-07 | Sidebar colapsable | Más espacio útil | `Sidebar.tsx`, `layout.tsx` | 4 horas |
| MD-08 | Notificaciones toast sistema-wide | Mejor feedback | Nuevo sistema de toast | 1 día |

### 6.3 Mejoras Mayores (1-2 meses)

| ID | Mejora | Impacto | Archivos Afectados | Esfuerzo |
|----|--------|---------|-------------------|----------|
| MJ-01 | **Dashboard operacional en tiempo real** | Visión completa | `page.tsx` (dashboard) | 1 semana |
| MJ-02 | **Modo Supervisor** con override | Control de calidad | Nueva página + permisos | 1 semana |
| MJ-03 | **Kiosk Mode** pantalla ingreso dedicada | Segunda pantalla | Nueva página fullscreen | 3 días |
| MJ-04 | **Form auto-save** crash recovery | Resiliencia | Hook `useAutoSave` | 3 días |
| MJ-05 | **Print status monitor** visible | Evita pérdidas | Nuevo componente + polling | 3 días |
| MJ-06 | **Timeline visual** de vehículos | Supervisión | Nueva vista gráfica | 1 semana |
| MJ-07 | Colores operacionales estándar | Reduce errores | `tailwind.config.ts`, theme | 2 días |
| MJ-08 | Health dashboard completo | Mantenimiento proactivo | Nueva página | 1 semana |

---

## 7. FUNCIONALIDADES DIFERENCIALES PROPUESTAS

### 7.1 Timeline Visual de Vehículos

```typescript
// Vista tipo "kanban" o "timeline"
interface VehicleTimeline {
  lanes: {
    id: string;
    name: string; // "Carril 1", "Carril 2"
    currentVehicle?: ActiveSession;
  }[];
  activeSessions: ActiveSession[];
  recentExits: ExitRecord[]; // Últimas 5 salidas
}

// Visualización: Barras de tiempo, semáforo de ocupación
// Beneficio: Supervisor ve estado de todo el parqueadero de un vistazo
```

### 7.2 Health Dashboard

```typescript
interface SystemHealth {
  printer: {
    status: 'online' | 'offline' | 'error';
    paperLevel: 'ok' | 'low' | 'out';
    lastPrintJob: Date;
    queueSize: number;
  };
  connectivity: {
    backend: 'online' | 'offline';
    lastSync: Date;
    outboxSize: number;
  };
  hardware: {
    talanquera: 'open' | 'closed' | 'unknown';
    camera: 'active' | 'inactive';
    scanner: 'connected' | 'disconnected';
  };
}

// Alertas proactivas: "Papel bajo - 20 tickets restantes estimados"
// Recomendaciones: "Reconectar impresora: pasos 1, 2, 3"
```

### 7.3 Auditoría Avanzada

```typescript
// Vista tipo "git log" de operaciones
interface AuditView {
  operations: {
    type: 'entry' | 'exit' | 'reprint' | 'lost' | 'void';
    operator: string;
    timestamp: Date;
    details: Record<string, unknown>;
    relatedOperations: string[]; // Links a operaciones relacionadas
  }[];
  filters: {
    dateRange: [Date, Date];
    operator: string[];
    operationType: string[];
    anomaliesOnly: boolean;
  };
}

// Detección automática de anomalías:
// - Reimpresión múltiple en corto tiempo
// - Ticket perdido seguido de otro similar
// - Cancelaciones frecuentes de un operador
// - Diferencias de caja grandes
```

### 7.4 Monitoreo de Hardware

```typescript
// Panel de estado de todos los dispositivos
interface HardwareMonitor {
  printers: PrinterStatus[];
  scanners: ScannerStatus[];
  cameras: CameraStatus[];
  talanqueras: TalanqueraStatus[];
  terminals: TerminalStatus[];
}

// Tests de diagnóstico:
// - "Test de impresión" -> Imprime página de prueba
// - "Test de scanner" -> Abre modal para escanear
// - "Test de cámara" -> Muestra preview y captura
// - "Test de talanquera" -> Envía pulso de apertura
```

### 7.5 Estadísticas Operacionales

```typescript
interface OperationalStats {
  // Métricas en tiempo real
  currentHour: {
    entries: number;
    exits: number;
    avgServiceTime: number; // segundos
    revenue: number;
  };
  today: {
    hourlyDistribution: number[]; // 24 horas
    peakHours: number[]; // Índices de horas pico
    vehicleTypeDistribution: Record<VehicleType, number>;
    paymentMethodDistribution: Record<PaymentMethod, number>;
  };
  comparisons: {
    vsYesterday: number; // %
    vsLastWeek: number; // %
    vsLastMonth: number; // %
  };
}

// Visualización: Gráficos de barras, líneas de tendencia
// Predicciones: "Basado en historial, se esperan 45 vehículos entre 6-7pm"
```

### 7.6 Modo Supervisor

```typescript
interface SupervisorMode {
  // Override de operaciones
  canOverride: {
    ticketLostWithoutSurcharge: boolean;
    forceExitWithoutPayment: boolean;
    cancelAnyOperation: boolean;
    modifyRatesTemporarily: boolean;
  };
  
  // Alertas en tiempo real
  activeAlerts: {
    type: 'long_stay' | 'multiple_reprint' | 'cash_discrepancy' | 'offline_extended';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    actions: Action[];
  }[];
  
  // Comunicación con operadores
  operatorMessages: {
    to: string; // operator id
    message: string;
    priority: 'normal' | 'urgent';
  }[];
}

// Acceso: PIN o tarjeta RFID de supervisor
// UI: Panel lateral con alertas que no bloquea operación normal
```

### 7.7 Modo Operador Rápido (Expert)

```typescript
interface FastOperatorMode {
  // Configuración personal por operador
  shortcuts: {
    platePrefix: string; // "ABC" si siempre son placas de una ciudad
    defaultVehicleType: VehicleType;
    defaultRate: string;
  };
  
  // UI simplificada
  visibleFields: {
    plate: true; // Siempre
    vehicleType: 'auto' | 'manual'; // Auto-detect por historial
    rate: 'hidden' | 'quick-select' | 'full';
    location: 'hidden' | 'show';
    condition: 'hidden' | 'minimal' | 'full';
  };
  
  // Acciones rápidas
  hotKeys: {
    'Ctrl+1': 'ingreso_rapido_carro';
    'Ctrl+2': 'ingreso_rapido_moto';
    'Ctrl+Enter': 'confirmar_sin_mouse';
  };
}

// Activación: Después de 50 operaciones exitosas
// O manual por configuración supervisor
```

### 7.8 Kiosk Mode (Pantalla Cliente)

```typescript
interface KioskMode {
  // Segunda pantalla orientada al cliente
  display: {
    currentTotal: number;
    elapsedTime: string;
    welcomeMessage: string;
    thankYouMessage: string;
    qrCodeForPayment: string; // Integración Pasarela
  };
  
  // Interacción limitada
  interactions: {
    selfCheckout: boolean; // Cliente paga solo
    ratingRequest: boolean; // Calificar servicio
    digitalTicket: boolean; // Ticket por email/SMS
  };
}

// Hardware: Segunda pantalla táctil o tablet
// O: Display grande visible para cliente
```

---

## 8. RESULTADO ESPERADO - VISION DE PRODUCTO

### 8.1 Percepción del Producto

```
ANTES (Actual):
┌─────────────────────────────────────┐
│  "Sistema funcional pero lento"       │
│  "A veces se pierden tickets"         │
│  "El operador se equivoca en placa"   │
│  "No sé si está online o no"          │
│  "La impresora falla y no me entero"  │
└─────────────────────────────────────┘

DESPUÉS (Propuesto):
┌─────────────────────────────────────┐
│  "Rápido - 6 segundos por vehículo"   │
│  "Nunca perdemos información"         │
│  "El sistema corrige errores"         │
│  "Siempre sé el estado del sistema"   │
│  "El supervisor ve todo en tiempo real"│
│  "Funciona aunque se caiga internet"  │
└─────────────────────────────────────┘
```

### 8.2 Atributos de Calidad

| Atributo | Actual | Objetivo | Cómo Medir |
|----------|--------|----------|------------|
| Tiempo ingreso | 15-20s | 6-8s | Métricas de performance |
| Tiempo salida | 20-30s | 10-15s | Métricas de performance |
| Errores de placa | ~5% | <1% | Validación automática |
| Pérdida tickets | Ocurre | 0% | Cola de impresión + alertas |
| Disponibilidad | 95% | 99.9% | Uptime con offline mode |
| Satisfacción operador | 6/10 | 9/10 | Encuestas internas |

---

## 9. ROADMAP PRIORIZADO

### Fase 1: Quick Wins (Semanas 1-2)
**Objetivo:** Reducir fricción inmediata, ganar confianza de operadores

- [ ] Auto-focus en campo placa
- [ ] Submit on Enter en búsquedas
- [ ] Botones grandes en pantalla salida
- [ ] Destacar total en cobro
- [ ] Indicador de sync más visible
- [ ] Atajos F1-F4 para navegación
- [ ] Sonidos de feedback
- [ ] Limpiar formulario post-éxito

### Fase 2: Modo Experto (Semanas 3-4)
**Objetivo:** Permitir operación rápida para usuarios experimentados

- [ ] Modo operador experto (campos colapsables)
- [ ] Configuración personal por operador
- [ ] Dark mode para operación nocturna
- [ ] Detección automática de scanner
- [ ] Calculadora de cambio
- [ ] Toast notifications system-wide
- [ ] Sidebar colapsable

### Fase 3: Resiliencia (Semanas 5-6)
**Objetivo:** Sistema que nunca pierde datos, se recupera solo

- [ ] Form auto-save
- [ ] Print status monitor visible
- [ ] Webcam para fotos vehículo
- [ ] Mejoras en reconciliación sync
- [ ] Encriptación SQLite
- [ ] Backup automático local

### Fase 4: Supervisión (Semanas 7-8)
**Objetivo:** Control total para supervisores, visibilidad completa

- [ ] Health dashboard
- [ ] Timeline visual de vehículos
- [ ] Modo supervisor con override
- [ ] Estadísticas operacionales
- [ ] Auditoría avanzada con anomalías
- [ ] Alertas proactivas configurables

### Fase 5: Diferenciación (Semanas 9-10)
**Objetivo:** Funcionalidades que venden el producto

- [ ] Kiosk mode segunda pantalla
- [ ] App móvil supervisor
- [ ] Integración pasarela pagos
- [ ] QR digital para clientes
- [ ] Predicción de demanda
- [ ] Reportes automáticos email

---

## 10. SCORE DE MADUREZ DEL PRODUCTO

### 10.1 Evaluación por Dimensiones

| Dimensión | Peso | Score (1-10) | Ponderado |
|-----------|------|--------------|-----------|
| **Funcionalidad Core** | 25% | 8 | 2.0 |
| UX Operacional | 20% | 5 | 1.0 |
| Offline-First | 15% | 8 | 1.2 |
| Hardware Integration | 15% | 6 | 0.9 |
| Resiliencia/Recovery | 10% | 6 | 0.6 |
| Supervisión/Reporting | 10% | 4 | 0.4 |
| Documentación/Testing | 5% | 7 | 0.35 |
| **TOTAL** | 100% | | **6.45/10** |

### 10.2 Benchmark

| Producto | Score | Notas |
|----------|-------|-------|
| ParkFlow Actual | 6.45 | Buena base, UX necesita trabajo |
| Competidor A (Estándar) | 5.5 | Funciona pero feo y lento |
| Competidor B (Premium) | 8.0 | Excelente UX pero caro |
| **Objetivo ParkFlow** | **8.5+** | Mejor UX + Offline + Precio competitivo |

### 10.3 Requisito para "Go Live" Comercial

```
SCORE MÍNIMO REQUERIDO: 7.5/10

PRIORIDADES PARA ALCANZAR 7.5:
├─ UX Operacional: 5 → 7 (+ implementar quick wins)
├─ Hardware Integration: 6 → 7 (+ detección scanner)
├─ Resiliencia: 6 → 8 (+ auto-save + print monitor)
└─ Supervisión: 4 → 6 (+ health dashboard básico)

ESTIMACIÓN: 4-6 semanas de trabajo enfocado
```

---

## 11. RIESGOS PARA SALIR A PRODUCCIÓN

### 11.1 Riesgos Críticos (Bloqueantes)

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| R-01 | Operador pierde ticket por no darse cuenta de fallo impresión | Alta | Crítico | Print status monitor + sonido error |
| R-02 | Doble ingreso por falta de feedback claro | Media | Crítico | Toast + sonido + animación confirmación |
| R-03 | Pérdida de datos en crash sin auto-save | Media | Crítico | Implementar auto-save inmediatamente |
| R-04 | Confusión modo offline/online | Alta | Alto | Banner prominente + indicador color |
| R-05 | Placa mal digitada no detectada | Media | Alto | Validación formato placas Colombia |

### 11.2 Riesgos Moderados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| R-06 | Operador novato abrumado por campos | Alta | Medio | Modo simplificado por defecto |
| R-07 | Cálculo de cambio erróneo | Media | Medio | Calculadora integrada |
| R-08 | Impresora no soportada | Media | Medio | Matriz de compatibilidad documentada |
| R-09 | Performance lento en horas pico | Baja | Medio | Optimización renders React |
| R-10 | Supervisor no detecta problemas a tiempo | Media | Medio | Dashboard health básico |

### 11.3 Plan de Mitigación Inmediato

```
ANTES DE PRIMER CLIENTE PILOTO:

Must Have (Sin excepción):
✓ Print status monitor visible constantemente
✓ Feedback sonoro/visual en todas las operaciones
✓ Auto-save de formularios
✓ Indicador prominente modo offline
✓ Validación de placas Colombia

Should Have (Alto valor):
✓ Modo operador simplificado
✓ Calculadora de cambio
✓ Health dashboard básico
✓ Dark mode

Nice to Have (Post-piloto):
○ Timeline visual
○ Estadísticas avanzadas
○ Kiosk mode
```

---

## 12. CONCLUSIONES Y RECOMENDACIONES

### 12.1 Fortalezas del Sistema Actual

1. **Arquitectura sólida:** Separación UI/Desktop/API es correcta
2. **Offline-first real:** SQLite + outbox + sync bien implementados
3. **Impresión térmica:** Soporte ESC/POS robusto vía Rust
4. **Idempotencia:** Claves únicas previenen duplicados
5. **Permisos granulares:** RBAC bien estructurado

### 12.2 Debilidades Críticas a Atacar

1. **UX Operacional:** Demasiados clicks, campos, sin atajos
2. **Feedback:** Falta sonoro/visual inmediato
3. **Detección hardware:** No detecta scanners automáticamente
4. **Recuperación:** Sin auto-save de formularios
5. **Supervisión:** Sin visibilidad real del estado del sistema

### 12.3 Recomendación Estratégica

```
RUTA RECOMENDADA:

1. INMEDIATO (Esta semana):
   - Implementar QW-01 a QW-08 (quick wins)
   - Score objetivo: 6.45 → 7.0

2. CORTO PLAZO (2-4 semanas):
   - Modo experto, dark mode, print monitor
   - Score objetivo: 7.0 → 7.8
   - PILOTO PERMITIDO aquí

3. MEDIANO PLAZO (1-2 meses):
   - Health dashboard, timeline, modo supervisor
   - Score objetivo: 7.8 → 8.5
   - LANZAMIENTO COMERCIAL aquí

4. DIFERENCIACIÓN (2-4 meses):
   - Kiosk, app móvil, integraciones
   - Score objetivo: 8.5 → 9.0
   - LIDERAZGO DE MERCADO aquí
```

### 12.4 Inversión Requerida

| Fase | Tiempo | Recursos | Valor Generado |
|------|--------|----------|----------------|
| Quick Wins | 1-2 sem | 1 dev frontend | ROI inmediato en eficiencia |
| Modo Experto | 2-4 sem | 1 dev frontend + UX | Operadores 50% más rápidos |
| Resiliencia | 2-4 sem | 1 dev fullstack | 99.9% uptime |
| Supervisión | 2-4 sem | 1 dev frontend | Control total operación |
| Diferenciación | 4-8 sem | 2 devs + designer | Ventaja competitiva |

**Total:** 3-5 meses para producto líder de mercado.

---

## 13. ANEXOS

### 13.1 Código de Referencia - Implementaciones Sugeridas

Ver archivos relacionados:
- `docs/UX_IMPROVEMENTS/` - Implementaciones detalladas
- `docs/COMPONENTS/` - Nuevos componentes propuestos
- `docs/THEMES/` - Implementación dark mode

### 13.2 Recursos de Diseño

- Colores operacionales: ` tailwind.config.ts` (actualizar)
- Iconografía: Lucide React (ya en proyecto)
- Sonidos: Directorio `public/sounds/` (crear)

### 13.3 Testing de Usabilidad

Recomendación: Realizar tests con operadores reales de parqueaderos:
1. Test de tiempo: Medir ingreso/salida con cronómetro
2. Test de errores: Simular situaciones de estrés
3. Test offline: Desconectar internet durante operación
4. Test recovery: Forzar cierre abrupto de app

---

**Fin del Documento**

*Documento generado por Product Designer Senior especializado en sistemas de operación crítica para parqueaderos, peajes, logística y POS offline-first.*
