# Especificación del Contrato Canónico de la API de ParkFlow
**Versión de la API:** `v1`  
**Estado:** `PROPUESTA`  
**Autor:** Staff API Design Architect  

---

## 1. Introducción y Filosofía de Diseño

Este documento establece el **Contrato Canónico de Respuesta y Errores** para toda la API de ParkFlow. El diseño de este contrato está inspirado en los estándares de excelencia de APIs públicas como **Stripe** y **GitHub**, adaptados para un entorno multi-tenant de alto rendimiento.

### Principios Fundamentales
1. **Predictibilidad**: El cliente debe saber exactamente qué estructura esperar sin importar si el endpoint es de configuración, transaccional o de administración.
2. **Seguridad frente a Errores de Tipado**: Se prohíbe el uso de estructuras de datos arbitrarias como `Map<String, Object>` en las respuestas del controlador. Toda respuesta debe representarse mediante DTOs o Records fuertemente tipados.
3. **Consistencia de Envoltura (Envelope)**: Todas las respuestas HTTP devuelven un envoltorio JSON común que contiene metadatos de telemetría (`meta`), control de flujo/éxito (`success`, `message`), y carga útil (`data` o `error`).
4. **Manejo de Errores Guiado por Códigos Estables**: Los clientes de frontend (web y desktop sync) NUNCA deben depender de los textos de los mensajes de error para tomar decisiones lógicas. En su lugar, deben procesar códigos de error estables legibles por máquina (e.g. `VALIDATION_ERROR`, `TENANT_BLOCKED`).
5. **Aislamiento Multi-Tenant Obligatorio**: Cada respuesta incluye de manera estándar el ID de la solicitud y el contexto de traza, facilitando la correlación de logs distribuida entre el cliente local (Tauri desktop) y la nube.

---

## 2. Estructura Única de Respuesta Exitosa

Cualquier petición exitosa (HTTP 200, 201) debe estructurar su cuerpo de respuesta con el siguiente sobre común:

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
  error: null;
  message: string; // Mensaje amigable para el usuario (español)
}

interface ApiMeta {
  timestamp: string;     // Formato ISO-8601 (UTC)
  path: string;          // URI de la solicitud original
  requestId: string;     // Correlation ID / Trace ID del backend (MDC)
  pagination?: PaginationMeta | null; // Nulo o ausente en respuestas unitarias
}
```

### Ejemplo: Respuesta Exitosa Unitaria (GET `/api/v1/configuration/rates/{id}`)
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Tarifa Plana Autos",
    "category": "STANDARD",
    "rateType": "HOURLY",
    "amount": 5000.00,
    "active": true,
    "createdAt": "2026-07-01T14:20:00Z",
    "updatedAt": "2026-07-01T14:20:00Z"
  },
  "meta": {
    "timestamp": "2026-07-01T14:20:05.123Z",
    "path": "/api/v1/configuration/rates/123e4567-e89b-12d3-a456-426614174000",
    "requestId": "corr-8f85f-abc9"
  },
  "error": null,
  "message": "Operación realizada correctamente"
}
```

---

## 3. Estructura Única de Respuesta de Error

Cualquier error en la API (HTTP 4xx, 5xx) debe retornar un código de estado adecuado y el siguiente sobre de error:

```typescript
interface ApiErrorResponse {
  success: false;
  data: null;
  meta: ApiMeta;
  error: ApiErrorDetails;
  message: string; // Resumen del error amigable para el usuario
}

interface ApiErrorDetails {
  code: string;            // Código único legible por máquina (e.g. "TENANT_BLOCKED")
  message: string;         // Mensaje amigable para el usuario
  traceId: string;         // ID de correlación igual a meta.requestId
  details?: Record<string, any> | null; // Detalles técnicos (developerMessage, etc.)
  issues?: ValidationIssue[] | null;   // Errores de validación específicos por campo
}

interface ValidationIssue {
  field: string;          // Ruta del campo en notación de puntos (e.g., "owner.email")
  code: string;           // Código de la validación fallida (e.g., "NOT_BLANK", "EMAIL")
  message: string;        // Mensaje de validación localizado (español)
  rejectedValue: any;     // El valor que causó el fallo (nulo si es sensible)
}
```

### Ejemplo: Error de Validación por Campos (HTTP 400 Bad Request)
```json
{
  "success": false,
  "data": null,
  "meta": {
    "timestamp": "2026-07-01T14:21:00.123Z",
    "path": "/api/v1/configuration/rates",
    "requestId": "corr-4a2b3-99ff"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los datos ingresados.",
    "traceId": "corr-4a2b3-99ff",
    "details": {
      "developerMessage": "MethodArgumentNotValidException: 2 field errors detected"
    },
    "issues": [
      {
        "field": "name",
        "code": "NOT_BLANK",
        "message": "El nombre es obligatorio",
        "rejectedValue": ""
      },
      {
        "field": "amount",
        "code": "POSITIVE",
        "message": "El valor debe ser mayor a cero",
        "rejectedValue": -150.00
      }
    ]
  },
  "message": "Revisa los datos ingresados."
}
```

### Ejemplo: Error de Negocio / Dominio (HTTP 409 Conflict)
```json
{
  "success": false,
  "data": null,
  "meta": {
    "timestamp": "2026-07-01T14:22:15.987Z",
    "path": "/api/v1/parking/sessions/entry",
    "requestId": "corr-7f12a-33bc"
  },
  "error": {
    "code": "VEHICLE_ALREADY_ACTIVE",
    "message": "El vehículo ya se encuentra dentro del parqueadero.",
    "traceId": "corr-7f12a-33bc",
    "details": {
      "plate": "ABC123",
      "activeSessionId": "987f6543-e21b-41d4-a716-446655449999"
    },
    "issues": null
  },
  "message": "El vehículo ya se encuentra dentro del parqueadero."
}
```

---

## 4. Estándar Único de Paginación

ParkFlow implementará un enfoque híbrido pero estandarizado bajo el bloque `meta.pagination`.

```typescript
type PaginationMeta = OffsetPaginationMeta | CursorPaginationMeta;

interface OffsetPaginationMeta {
  type: "offset";
  page: number;          // Página actual (0-indexed)
  size: number;          // Cantidad de elementos por página
  totalElements: number; // Total de registros en la DB
  totalPages: number;    // Total de páginas calculadas
  hasNext: boolean;
  hasPrev: boolean;
}

interface CursorPaginationMeta {
  type: "cursor";
  size: number;          // Cantidad máxima solicitada
  hasNext: boolean;      // Indica si hay más registros adelante
  hasPrev: boolean;      // Indica si hay registros anteriores
  nextCursor: string | null; // Token codificado en base64 para la siguiente página
  prevCursor: string | null; // Token codificado en base64 para la página anterior
}
```

### Decisión de Diseño: Offset vs Cursor

| Característica | Offset Pagination (`page`/`size`) | Cursor Pagination (`cursor`/`limit`) |
| :--- | :--- | :--- |
| **Casos de Uso** | Catálogos estáticos y de configuración (Tarifas, Convenios, Usuarios, Sedes). | Flujos transaccionales masivos y sincronización de datos (Auditoría, Sesiones de Parqueadero, Eventos de Cola). |
| **Rendimiento** | **Bajo para páginas profundas**: SQL `OFFSET N` obliga al motor a escanear y descartar N filas. O(N) en tiempo de lectura. | **Excelente y Constante**: SQL `WHERE id > cursor LIMIT size` utiliza índices directos. O(1) constante. |
| **Consistencia ante Mutaciones** | **Pobre**: Si se insertan o eliminan registros en tiempo real, el cliente ve registros duplicados o saltados al cambiar de página. | **Perfecta**: Al anclarse a un identificador físico (Keyset), la paginación no se altera ante escrituras concurrentes. |
| **UX de UI** | Ideal para tablas administrativas clásicas con buscador y enlaces de página (1, 2, 3...). | Ideal para Scroll Infinito, Carga Incremental y agentes de Sincronización Desktop (Tauri). |

### Justificación de la Elección Híbrida
En ParkFlow elegimos implementar **ambos esquemas según el dominio**, pero unificados en la telemetría de metadatos. 
* Los endpoints del **módulo de configuración** (e.g. `/api/v1/configuration/rates`) usarán paginación **Offset** porque los administradores necesitan saber exactamente cuántos elementos totales hay y saltar libremente a páginas específicas en pantallas de configuración de baja frecuencia de cambio.
* Los endpoints del **módulo operativo** (e.g. `/api/v1/operations/sessions/active-list` o logs de auditoría) usarán paginación por **Cursor** (Keyset) para garantizar la consistencia absoluta en el cliente de Tauri y evitar sobrecargar la base de datos PostgreSQL con consultas de conteo total (`COUNT(*)`) de millones de registros operativos.

### Ejemplo: Respuesta con Paginación Offset (GET `/api/v1/configuration/rates?page=0&size=2`)
```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", "name": "Tarifa Autos" },
    { "id": "uuid-2", "name": "Tarifa Motos" }
  ],
  "meta": {
    "timestamp": "2026-07-01T14:24:00Z",
    "path": "/api/v1/configuration/rates",
    "requestId": "corr-pag-offset",
    "pagination": {
      "type": "offset",
      "page": 0,
      "size": 2,
      "totalElements": 15,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "error": null,
  "message": "Operación realizada correctamente"
}
```

### Ejemplo: Respuesta con Paginación Cursor (GET `/api/v1/operations/sessions/active-list?limit=2&starting_after=eyJpZCI6...`)
```json
{
  "success": true,
  "data": [
    { "ticketNumber": "TKT001", "plate": "ABC123" },
    { "ticketNumber": "TKT002", "plate": "XYZ789" }
  ],
  "meta": {
    "timestamp": "2026-07-01T14:25:00Z",
    "path": "/api/v1/operations/sessions/active-list",
    "requestId": "corr-pag-cursor",
    "pagination": {
      "type": "cursor",
      "size": 2,
      "hasNext": true,
      "hasPrev": true,
      "nextCursor": "eyJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMiIsImNyZWF0ZWRBdCI6IjIwMjYtMDctMDFUMTQ6MjU6MDAifQ==",
      "prevCursor": "eyJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCIsImNyZWF0ZWRBdCI6IjIwMjYtMDctMDFUMTQ6MjA6MDAifQ=="
    }
  },
  "error": null,
  "message": "Operación realizada correctamente"
}
```

---

## 5. Mapeo Semántico de Códigos HTTP y Códigos de Error

Para mantener consistencia a nivel empresarial, los códigos de estado HTTP se mapearán rígidamente con los códigos de error del negocio.

| Código HTTP | Escenario | Código Canónico `error.code` |
| :--- | :--- | :--- |
| **200 OK** | Lectura exitosa, actualización exitosa. | *(Ninguno / Error es null)* |
| **201 Created** | Creación exitosa de recursos. | *(Ninguno)* |
| **204 No Content** | Operación mutadora exitosa que no retorna datos (ej. eliminar). | *(Ninguno)* |
| **400 Bad Request** | Solicitud mal formada sintácticamente o argumentos inválidos genéricos. | `INVALID_ARGUMENT`, `MALFORMED_JSON` |
| **401 Unauthorized** | Token ausente, expirado o firma inválida. | `UNAUTHORIZED`, `TOKEN_EXPIRED` |
| **403 Forbidden** | Usuario autenticado pero sin permisos (roles/privilegios) suficientes. | `ACCESS_DENIED`, `ROLE_NOT_ALLOWED` |
| **404 Not Found** | El recurso solicitado por ID o ruta no existe. | `RESOURCE_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| **409 Conflict** | Conflicto de estado (bloqueo optimista, duplicidad de llaves únicas, etc). | `CONCURRENT_MODIFICATION_ERROR`, `DUPLICATE_KEY_ERROR`, `INVALID_STATE` |
| **422 Unprocessable** | Falla de lógica de validación semántica (ej. el correo existe en validación Bean). | `VALIDATION_ERROR` |
| **429 Too Many Requests** | Tasa de solicitudes por minuto excedida (Rate Limit). | `RATE_LIMIT_EXCEEDED` |
| **500 Internal Error** | Excepciones no controladas de base de datos o lógica interna. | `INTERNAL_ERROR`, `DATABASE_QUERY_ERROR` |
| **503 Service Unavailable** | El sistema está en mantenimiento o dependencias vitales offline. | `SERVICE_UNAVAILABLE` |
