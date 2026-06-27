# DTOs Compartidas (Common Module)

**Estado:** ✅ 13 DTOs consolidadas (2026-06-24)  
**Ubicación:** `apps/api/src/main/java/com/parkflow/common/dto/`

---

## 📚 Introducción

**DTOs (Data Transfer Objects)** son objetos simples para transferir datos entre capas.

**Decisión en ParkFlow:** Consolidar DTOs compartidas en módulo `/common/` para evitar duplicación.

**Beneficio:** Si 5 módulos necesitan `RateResponse`, definir UNA VEZ en common y reutilizar.

```
application/dto/        ← DTOs específicas del módulo
    ├── CreateRateRequest
    ├── UpdateRateRequest
    └── RateResponse (COMPARTIDA con cash)

common/dto/             ← DTOs reutilizadas (13 totales)
    ├── RateResponse
    ├── CashSessionResponse
    ├── PaymentEntryResponse
    ├── InvoiceResponse
    └── ... (10 más)
```

---

## 📋 Inventario de 13 DTOs Compartidas

| DTO | Módulos que la usan | Propósito | Último actualizado |
|-----|---|---|---|
| `RateResponse` | configuration, parking.operation, billing, sync | Respuesta de tarifa | 2026-06-24 |
| `RateRequest` | configuration | Crear/actualizar tarifa | 2026-06-24 |
| `VehicleTypeResponse` | configuration, parking.operation, sync | Tipo de vehículo | 2026-06-24 |
| `CashSessionResponse` | cash, billing, sync, reports | Sesión de caja | 2026-06-24 |
| `CashMovementResponse` | cash, sync | Movimiento de caja | 2026-06-24 |
| `ParkingSessionResponse` | parking.operation, billing, sync, reports | Sesión de estacionamiento | 2026-06-24 |
| `ReceiptResponse` | parking.operation, sync | Recibo | 2026-06-24 |
| `PaymentEntryResponse` | parking.operation, billing, sync | Entrada de pago | 2026-06-24 |
| `InvoiceResponse` | billing, sync, reports | Factura | 2026-06-24 |
| `InvoiceItemResponse` | billing, sync | Item de factura | 2026-06-24 |
| `LicenseResponse` | licensing, sync | Información de licencia | 2026-06-24 |
| `AuditLogResponse` | audit, sync, reports | Log de auditoría | 2026-06-24 |
| `ErrorResponse` | (todos) | Error estándar | 2026-06-24 |

---

## 🏗️ Estructura de una DTO

### Principios

- **Validación:** `@NotNull`, `@DecimalMin`, `@Email`, etc. en request DTOs
- **Serialización:** `@JsonFormat`, `@JsonProperty`, etc.
- **Inmutabilidad:** `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor` (Lombok)
- **Documentación:** `@Schema` (Swagger)

### Ejemplo 1: RateRequest (request)

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(
    title = "Create/Update Rate Request",
    description = "Rate configuration for parking sessions"
)
public class RateRequest {
    
    @NotNull(message = "Company ID required")
    @Schema(description = "Company that owns this rate", example = "123e4567-e89b-12d3-a456-426614174000")
    private UUID companyId;
    
    @NotNull(message = "Rate name required")
    @Size(min = 3, max = 100, message = "Name must be 3-100 characters")
    @Schema(description = "Human-readable rate name", example = "Premium Rate")
    private String name;
    
    @NotNull(message = "Start date required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Schema(description = "When this rate becomes active", example = "2026-01-01")
    private LocalDate startDate;
    
    @NotNull(message = "End date required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Schema(description = "When this rate expires", example = "2026-12-31")
    private LocalDate endDate;
    
    @NotNull(message = "Price required")
    @DecimalMin(value = "0.01", message = "Price must be positive")
    @DecimalMax(value = "99999.99", message = "Price exceeds maximum")
    @Schema(description = "Price per hour", example = "5.50")
    private BigDecimal pricePerHour;
    
    @NotNull(message = "Vehicle type required")
    @Schema(description = "Which vehicle type this rate applies to", example = "CAR")
    private String vehicleType;
    
    @Schema(
        description = "Optional notes (max 500 chars)",
        example = "Holiday rate, special pricing for long-term parking"
    )
    @Size(max = 500)
    private String notes;
}
```

**Validaciones (validation.json):**
```json
{
  "@NotNull": "Este campo es obligatorio",
  "@Size": "El tamaño debe estar entre {min} y {max}",
  "@DecimalMin": "El precio mínimo es {value}",
  "@Email": "Email inválido"
}
```

### Ejemplo 2: RateResponse (response)

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(
    title = "Rate Response",
    description = "Complete rate information with audit trail"
)
public class RateResponse {
    
    @Schema(description = "Unique identifier", example = "123e4567-e89b-12d3-a456-426614174000")
    private UUID id;
    
    @Schema(description = "Company that owns this rate")
    private UUID companyId;
    
    @Schema(description = "Rate name", example = "Premium Rate")
    private String name;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Schema(description = "When this rate became active")
    private LocalDate startDate;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Schema(description = "When this rate expires")
    private LocalDate endDate;
    
    @Schema(description = "Price per hour", example = "5.50")
    private BigDecimal pricePerHour;
    
    @Schema(description = "Vehicle type", example = "CAR")
    private String vehicleType;
    
    @Schema(description = "Optional notes")
    private String notes;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    @Schema(description = "When this rate was created")
    private LocalDateTime createdAt;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    @Schema(description = "When this rate was last updated")
    private LocalDateTime updatedAt;
    
    @Schema(description = "Whether this rate is currently active")
    private boolean active;
}
```

**Observaciones:**
- ✅ Response incluye `id`, `createdAt`, `updatedAt` (audit)
- ✅ Response incluye `active` (estado derivado)
- ❌ Response NO incluye campos sensibles (ej: internal flags)

### Ejemplo 3: CashSessionResponse

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(title = "Cash Session Response")
public class CashSessionResponse {
    
    @Schema(description = "Unique session ID")
    private UUID id;
    
    @Schema(description = "Company this session belongs to")
    private UUID companyId;
    
    @Schema(description = "Terminal/cashier that opened this session")
    private String terminalCode;
    
    @Schema(description = "Opening balance")
    private BigDecimal openingBalance;
    
    @Schema(description = "Current balance")
    private BigDecimal currentBalance;
    
    @Schema(description = "Closing balance (null if open)")
    private BigDecimal closingBalance;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    @Schema(description = "When session was opened")
    private LocalDateTime openedAt;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    @Schema(description = "When session was closed")
    private LocalDateTime closedAt;
    
    @Schema(description = "Session status")
    @JsonProperty("status")
    private String status;  // OPEN, CLOSED, RECONCILED
    
    @Schema(description = "Variance between opening and closing")
    private BigDecimal variance;
}
```

### Ejemplo 4: ErrorResponse (usado en toda la API)

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(title = "Error Response")
public class ErrorResponse {
    
    @Schema(description = "Error code for machine-readable handling", example = "RATE_NOT_FOUND")
    private String code;
    
    @Schema(description = "User-friendly error message", example = "The requested rate does not exist")
    private String message;
    
    @Schema(description = "Technical details (stack trace in dev only)")
    private String details;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    @Schema(description = "When error occurred")
    private LocalDateTime timestamp;
    
    @Schema(description = "Request path where error occurred", example = "/api/v1/configuration/rates/123")
    private String path;
    
    @Schema(description = "HTTP status code", example = "404")
    private int status;
    
    @Schema(description = "Unique identifier for tracing", example = "abc123-def456")
    private String correlationId;
    
    @Schema(description = "Validation errors (if applicable)")
    private Map<String, List<String>> fieldErrors;
}
```

---

## 🔄 Mapeo: DTO ↔ Entity ↔ Domain

**Flujo de datos:**

```
Client JSON
    ↓ Deserialize
Request DTO (validation)
    ↓ Map to Domain
Domain Entity (business logic)
    ↓ Persist
JPA Entity (database)
    ↓ Map to Domain
Domain Entity (reconstitution)
    ↓ Map to DTO
Response DTO
    ↓ Serialize
JSON to Client
```

### Ejemplo: Crear Rate

```java
// 1. Cliente envía JSON
POST /api/v1/configuration/rates
{
  "companyId": "uuid",
  "name": "Premium",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "pricePerHour": 5.50,
  "vehicleType": "CAR"
}

// 2. Spring deserializa a RateRequest DTO
RateRequest request = ...;  // @Valid valida automáticamente

// 3. Service mapea a Domain
Rate rate = Rate.create(
    request.getCompanyId(),
    request.getName(),
    request.getStartDate(),
    request.getEndDate(),
    request.getPricePerHour(),
    request.getVehicleType()
);

// 4. Adapter mapea a JPA Entity
RateEntity entity = mapper.toEntity(rate);

// 5. JPA persiste
jpaRepository.save(entity);

// 6. Adapter mapea JPA → Domain
Rate reconstituted = mapper.toDomain(entity);

// 7. Service mapea a Response DTO
RateResponse response = new RateResponse(
    rate.getId(),
    rate.getCompanyId(),
    rate.getName(),
    ...
);

// 8. Spring serializa a JSON
{
  "id": "uuid",
  "companyId": "uuid",
  "name": "Premium",
  ...,
  "createdAt": "2026-01-01T10:30:00Z",
  "updatedAt": "2026-01-01T10:30:00Z",
  "active": true
}
```

### Mapper en código

```java
@Component
public class RateMapper {
    
    // Request → Domain
    public Rate toDomain(RateRequest request) {
        return Rate.create(
            request.getCompanyId(),
            request.getName(),
            request.getStartDate(),
            request.getEndDate(),
            request.getPricePerHour(),
            VehicleType.valueOf(request.getVehicleType())
        );
    }
    
    // Domain → Entity
    public RateEntity toEntity(Rate rate) {
        return new RateEntity(
            rate.getId(),
            rate.getCompanyId(),
            rate.getName(),
            rate.getStartDate(),
            rate.getEndDate(),
            rate.getPricePerHour(),
            rate.getVehicleType().name(),
            null,  // createdAt (auto-set)
            null   // updatedAt (auto-set)
        );
    }
    
    // Entity → Domain
    public Rate toDomain(RateEntity entity) {
        return Rate.reconstruct(
            entity.getId(),
            entity.getCompanyId(),
            entity.getName(),
            entity.getStartDate(),
            entity.getEndDate(),
            entity.getPricePerHour(),
            VehicleType.valueOf(entity.getVehicleType())
        );
    }
    
    // Domain → Response
    public RateResponse toResponse(Rate rate) {
        return new RateResponse(
            rate.getId(),
            rate.getCompanyId(),
            rate.getName(),
            rate.getStartDate(),
            rate.getEndDate(),
            rate.getPricePerHour(),
            rate.getVehicleType().name(),
            null,  // notes (si aplica)
            rate.getCreatedAt(),
            rate.getUpdatedAt(),
            rate.isActive()
        );
    }
}
```

---

## ✅ Reglas de DTOs en ParkFlow

### Request DTOs (`*Request.java`)

- ✅ Validadas con `@NotNull`, `@Size`, `@Email`, etc.
- ✅ Solo campos que el cliente puede especificar
- ✅ ❌ NO incluye `id`, `createdAt`, `updatedAt`

```java
✅ public class CreateRateRequest {
    @NotNull
    private UUID companyId;
    @NotNull
    private String name;
}

❌ public class CreateRateRequest {
    private UUID id;              // ← Cliente NO elige ID
    private LocalDateTime createdAt;  // ← Se auto-genera
}
```

### Response DTOs (`*Response.java`)

- ✅ Todos los campos públicos (incluye audit)
- ✅ Solo lectura (no usadas en requests)
- ✅ Contiene `id`, `createdAt`, `updatedAt`

```java
✅ public class RateResponse {
    private UUID id;              // ← Cliente ve el ID creado
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### DTO Consolidadas vs. Específicas

| Escenario | Ubicación | Ejemplo |
|-----------|-----------|---------|
| Usada por **2+ módulos** | `common/dto/` | `RateResponse`, `CashSessionResponse` |
| Usada por **1 módulo** | `<module>/dto/` | `DetailedRateAnalyticsResponse` (solo en reports) |
| Transformación interna | (sin DTO) | Mapping intermedio entre layers |

---

## 🔍 Cuándo Crear Nueva DTO

### Scenario 1: Reutilización (Crear en common/)

```java
// Múltiples módulos necesitan info de tarifa
✅ common/dto/RateResponse.java

// Usado por:
// - configuration/infrastructure/controller/RateController.java
// - parking/operation/infrastructure/controller/PricingController.java
// - billing/infrastructure/controller/InvoiceController.java
```

### Scenario 2: Específica del módulo (Crear en <module>/dto/)

```java
// Detalle interno de reporte de ocupancia
✅ parking/spaces/dto/SpaceOccupancyDetailResponse.java

// Usado SOLO por:
// - parking/spaces/infrastructure/controller/OccupancyReportController.java
```

### Scenario 3: Transformación interna (SIN DTO)

```java
// Mapeo intermedio dentro del servicio
// (no merita DTO, es cálculo temporal)

public BigDecimal calculateFinalPrice(PricingContext ctx) {
    // Usar objetos temporales si necesario
    class PriceBreakdown {
        BigDecimal basePrice;
        BigDecimal tax;
        BigDecimal discount;
    }
    
    PriceBreakdown breakdown = compute(ctx);
    return breakdown.basePrice
        .add(breakdown.tax)
        .subtract(breakdown.discount);
}
```

---

## 🛡️ Seguridad en DTOs

### ❌ NUNCA exponer datos sensibles

```java
❌ public class AppUserResponse {
    private String email;
    private String passwordHash;        // ← SENSIBLE
    private String internalUserId;      // ← INTERNO
    private List<String> permissions;   // ← Revelaría ACL
}
```

### ✅ Exponer SOLO datos públicos

```java
✅ public class AppUserResponse {
    private UUID id;
    private String email;
    private String fullName;
    private LocalDateTime lastLogin;
    private boolean active;
    
    // ❌ NO incluye: passwordHash, internalId, permissions
}
```

---

## 📝 Decisión: Versionado de DTOs

**Escenario:** Cambiar estructura de `RateResponse`.

**Opción A: Versionado en URL**
```
GET /api/v1/rates/{id}          → RateResponse v1
GET /api/v2/rates/{id}          → RateResponse v2 (diferente)
```

**Opción B: Agregación (Recomendado)**
```
GET /api/v1/rates/{id}          → RateResponse (versión actual)
GET /api/v1/rates/{id}?detail=full  → Incluye campos adicionales
```

**Decisión en ParkFlow:** Opción B (sin quiebre de API).

---

## 🔗 Véase También

- [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md) — Dónde van las DTOs
- [api-modules.md](api-modules.md) — DTOs por módulo
- [ANTIPATTERNS.md](ANTIPATTERNS.md) — ❌ NO exponer entities

---

**Última actualización:** 27 de junio de 2026  
**Consolidación:** Fase 2026-06-24 (13 DTOs centralizadas)
