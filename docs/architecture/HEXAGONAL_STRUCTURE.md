# Arquitectura Hexagonal: Guía Completa

**Estado:** ✅ Implementado 100% en ParkFlow Backend (17/17 módulos)  
**Última actualización:** 27 de junio de 2026

---

## 📚 Introducción

La arquitectura hexagonal (también llamada **Ports & Adapters**) separa la lógica de negocio de las tecnologías específicas. Esto permite:

- **Testabilidad:** Tests sin frameworks
- **Escalabilidad:** Cambiar implementaciones sin modificar lógica
- **Claridad:** Cada capa tiene responsabilidades claras
- **Mantenibilidad:** Nuevos developers entienden estructura rápidamente

**En ParkFlow:** Cada módulo DEBE seguir esta estructura. No hay excepciones.

---

## 🏗️ Estructura Completa de un Módulo

```
com/parkflow/modules/<module-name>/
│
├── application/                           ← CASOS DE USO
│   ├── port/
│   │   ├── in/                            ← INPUT PORTS (interfaces)
│   │   │   ├── CreateRateUseCase.java
│   │   │   ├── UpdateRateUseCase.java
│   │   │   └── QueryRateUseCase.java
│   │   │
│   │   └── out/                           ← OUTPUT PORTS (contratos)
│   │       ├── RateRepositoryPort.java
│   │       └── AuditRepositoryPort.java
│   │
│   ├── service/                           ← IMPLEMENTACIONES (max 5 métodos públicos por servicio)
│   │   ├── RateManagementService.java
│   │   ├── RateQueryService.java
│   │   └── RatePricingService.java
│   │
│   └── dto/                               ← TRANSFER OBJECTS
│       ├── CreateRateRequest.java
│       ├── UpdateRateRequest.java
│       └── RateResponse.java
│
├── domain/                                ← LÓGICA DE NEGOCIO PURA
│   ├── rate/                              ← BOUNDED CONTEXT (agrupa conceptos relacionados)
│   │   ├── Rate.java                      ← Entidad de dominio
│   │   ├── RateType.java                  ← Value Object
│   │   ├── RateValidationException.java   ← Excepción de dominio
│   │   └── RateDomainService.java         ← Lógica cross-entity (RARO)
│   │
│   ├── rounding/
│   │   ├── RoundingMode.java
│   │   └── RoundingStrategy.java
│   │
│   ├── exception/
│   │   ├── RateOverlapException.java
│   │   ├── InvalidRateException.java
│   │   └── RatePricingException.java
│   │
│   └── shared/                            ← Constantes y utilidades del módulo
│       ├── RateConstants.java
│       └── RateValidator.java
│
├── infrastructure/                        ← IMPLEMENTACIONES TÉCNICAS
│   ├── controller/                        ← REST ENDPOINTS
│   │   ├── RateController.java
│   │   └── RateControllerAdvice.java      ← Error handling (opcional)
│   │
│   ├── persistence/                       ← JPA REPOSITORIES
│   │   ├── RateJpaRepository.java         ← Spring Data JPA
│   │   ├── RateRepositoryAdapter.java     ← Implementa RateRepositoryPort
│   │   ├── RateEntity.java                ← JPA @Entity
│   │   └── mapper/
│   │       └── RateMapper.java            ← Entity ↔ Domain
│   │
│   ├── event/                             ← EVENT HANDLING
│   │   ├── RateCreatedEventHandler.java
│   │   └── RateUpdatedEventPublisher.java
│   │
│   ├── config/                            ← CONFIGURACIÓN DEL MÓDULO
│   │   └── RateModuleConfig.java
│   │
│   └── external/                          ← INTEGRACIONES (si aplica)
│       └── RatePricingExternalService.java
│
└── test/                                  ← TESTS (espejando estructura)
    ├── application/
    │   ├── RateManagementServiceTest.java
    │   └── RateQueryServiceTest.java
    ├── domain/
    │   ├── RateTest.java
    │   └── RateValidationTest.java
    └── infrastructure/
        ├── RateControllerTest.java
        └── RateRepositoryAdapterTest.java
```

---

## 🔍 Detalle de cada Capa

### 1️⃣ **DOMAIN Layer** — Lógica de Negocio Pura

**Responsabilidad:** Contiene TODA la lógica de negocio, sin dependencias en frameworks.

**Qué va aquí:**
- `Entity` — Objeto con identidad única (Rate, Vehicle, ParkingSession)
- `ValueObject` — Objeto sin identidad (Money, Address, RateType)
- `DomainService` — Lógica que cruza múltiples entidades (RARO — casi nunca)
- `Exception` — Excepciones de dominio (RateOverlapException, InvalidRateException)

**Qué NO va aquí:**
- ❌ JPA annotations (excepto pragmáticamente `@Embeddable`)
- ❌ Spring beans o inyección de dependencias
- ❌ Repository calls (sin dependencias en persistence)
- ❌ REST controllers
- ❌ DTOs

**Ejemplo: Rate.java**
```java
public class Rate {
    private final UUID id;
    private final UUID companyId;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final BigDecimal price;

    private Rate(UUID id, UUID companyId, LocalDate startDate, 
                 LocalDate endDate, BigDecimal price) {
        validateDateRange(startDate, endDate);
        validatePrice(price);
        
        this.id = id;
        this.companyId = companyId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.price = price;
    }

    public static Rate create(UUID companyId, LocalDate startDate,
                              LocalDate endDate, BigDecimal price) {
        return new Rate(
            UUID.randomUUID(),
            companyId,
            startDate,
            endDate,
            price
        );
    }

    private static void validateDateRange(LocalDate start, LocalDate end) {
        if (start.isAfter(end)) {
            throw new InvalidRateException("Start date cannot be after end date");
        }
    }

    private static void validatePrice(BigDecimal price) {
        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRateException("Price must be positive");
        }
    }

    // Getters, equals, hashCode (NO setters para inmutabilidad)
}
```

---

### 2️⃣ **APPLICATION Layer** — Casos de Uso

**Responsabilidad:** Orquestar el flujo de datos entre domain y infrastructure.

#### **port/in** — INPUT PORTS (Interfaces de Entrada)

Define QUÉ PUEDE HACER el módulo (contratos para quien lo usa).

```java
// Input port: contrato para crear una tarifa
public interface CreateRateUseCase {
    RateResponse create(CreateRateRequest request);
}

// Input port: consultar tarifas
public interface QueryRateUseCase {
    RateResponse getById(UUID id);
    Page<RateResponse> listByCompany(UUID companyId, Pageable page);
}

// Input port: actualizar tarifa
public interface UpdateRateUseCase {
    RateResponse update(UUID id, UpdateRateRequest request);
}
```

**Regla:** Cada port = un caso de uso específico. No mezcles "crear, leer, actualizar, eliminar" en un port.

#### **port/out** — OUTPUT PORTS (Interfaces de Salida)

Define QUÉ NECESITA del exterior (contratos para persistence/servicios externos).

```java
// Output port: persistencia
public interface RateRepositoryPort {
    void save(Rate rate);
    Optional<Rate> findById(UUID id);
    List<Rate> findByCompanyAndDateRange(UUID companyId, LocalDate start, LocalDate end);
    void delete(UUID id);
}

// Output port: auditoría
public interface AuditRepositoryPort {
    void log(String entity, String action, String details, UUID userId);
}

// Output port: validación externa (si existe)
public interface ExternalPricingPort {
    BigDecimal fetchMarketPrice(String rateCode);
}
```

#### **service/** — IMPLEMENTACIONES

Implementan los ports. Máximo 5 métodos públicos por servicio.

```java
@Service
@RequiredArgsConstructor
public class RateManagementService implements CreateRateUseCase, UpdateRateUseCase {
    private final RateRepositoryPort rateRepository;
    private final AuditRepositoryPort auditRepository;

    @Override
    public RateResponse create(CreateRateRequest request) {
        Rate rate = Rate.create(
            request.getCompanyId(),
            request.getStartDate(),
            request.getEndDate(),
            request.getPrice()
        );
        rateRepository.save(rate);
        auditRepository.log("Rate", "CREATE", "Rate created: " + rate.getId(), getCurrentUserId());
        return toResponse(rate);
    }

    @Override
    public RateResponse update(UUID id, UpdateRateRequest request) {
        Rate rate = rateRepository.findById(id)
            .orElseThrow(() -> new RateNotFoundException(id));
        
        Rate updated = rate.updatePrice(request.getPrice());
        rateRepository.save(updated);
        auditRepository.log("Rate", "UPDATE", "Price updated to " + request.getPrice(), getCurrentUserId());
        
        return toResponse(updated);
    }

    // Total: 2 métodos públicos ✓
    // Si necesitas más, crea RateQueryService, RatePricingService, etc.
}

@Service
@RequiredArgsConstructor
public class RateQueryService implements QueryRateUseCase {
    private final RateRepositoryPort rateRepository;

    @Override
    public RateResponse getById(UUID id) {
        return rateRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new RateNotFoundException(id));
    }

    @Override
    public Page<RateResponse> listByCompany(UUID companyId, Pageable page) {
        // Implementar consulta paginada
        return ...
    }
}
```

**Regla:** Si un servicio supera 5 métodos públicos, es un "god service" — split en múltiples servicios.

#### **dto/** — Transfer Objects

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRateRequest {
    @NotNull(message = "Company ID required")
    private UUID companyId;

    @NotNull
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @NotNull
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal price;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RateResponse {
    private UUID id;
    private UUID companyId;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal price;
    private LocalDateTime createdAt;
}
```

---

### 3️⃣ **INFRASTRUCTURE Layer** — Implementaciones Técnicas

**Responsabilidad:** Detalles técnicos (BD, HTTP, eventos, etc.).

#### **controller/** — REST Endpoints

```java
@RestController
@RequestMapping("/api/v1/configuration/rates")
@RequiredArgsConstructor
public class RateController {
    private final CreateRateUseCase createRateUseCase;
    private final UpdateRateUseCase updateRateUseCase;
    private final QueryRateUseCase queryRateUseCase;

    @PostMapping
    @Operation(summary = "Create a new rate")
    @ApiResponse(responseCode = "201", description = "Rate created")
    public ResponseEntity<RateResponse> create(@RequestBody @Valid CreateRateRequest request) {
        RateResponse response = createRateUseCase.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get rate by ID")
    public ResponseEntity<RateResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(queryRateUseCase.getById(id));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update rate")
    public ResponseEntity<RateResponse> update(
            @PathVariable UUID id,
            @RequestBody @Valid UpdateRateRequest request) {
        RateResponse response = updateRateUseCase.update(id, request);
        return ResponseEntity.ok(response);
    }
}
```

**Regla:** Controllers SOLO orquestan (inyectan ports, validan @RequestBody, retornan ResponseEntity). Lógica → services.

#### **persistence/** — Persistencia

```java
// 1. JPA Repository (Spring Data)
@Repository
public interface RateJpaRepository extends JpaRepository<RateEntity, UUID> {
    List<RateEntity> findByCompanyIdAndStartDateBefore(UUID companyId, LocalDate date);
}

// 2. JPA Entity (mapeo a BD)
@Entity
@Table(name = "rate", indexes = {
    @Index(name = "idx_rate_company", columnList = "company_id"),
    @Index(name = "idx_rate_dates", columnList = "start_date, end_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RateEntity {
    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID companyId;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

// 3. Adapter: implementa output port
@Component
@RequiredArgsConstructor
public class RateRepositoryAdapter implements RateRepositoryPort {
    private final RateJpaRepository jpaRepository;
    private final RateMapper mapper;

    @Override
    public void save(Rate rate) {
        RateEntity entity = mapper.toDomain(rate);
        jpaRepository.save(entity);
    }

    @Override
    public Optional<Rate> findById(UUID id) {
        return jpaRepository.findById(id)
            .map(mapper::toDomain);
    }

    @Override
    public List<Rate> findByCompanyAndDateRange(UUID companyId, LocalDate start, LocalDate end) {
        return jpaRepository.findByCompanyIdAndStartDateBefore(companyId, end)
            .stream()
            .map(mapper::toDomain)
            .toList();
    }

    @Override
    public void delete(UUID id) {
        jpaRepository.deleteById(id);
    }
}

// 4. Mapper: conversión Entity ↔ Domain
@Component
public class RateMapper {
    public Rate toDomain(RateEntity entity) {
        return Rate.create(
            entity.getCompanyId(),
            entity.getStartDate(),
            entity.getEndDate(),
            entity.getPrice()
        );
    }

    public RateEntity toDomain(Rate rate) {
        return new RateEntity(
            rate.getId(),
            rate.getCompanyId(),
            rate.getStartDate(),
            rate.getEndDate(),
            rate.getPrice(),
            null,
            null
        );
    }
}
```

---

## ✅ Checklist: Completitud de un Módulo

Antes de hacer commit, verifica TODO esto:

### Domain Layer
- [ ] `domain/` existe con entidades y value objects
- [ ] Excepciones de dominio en `domain/exception/`
- [ ] CERO referencias a Spring, JPA o repositories
- [ ] Validaciones en domain, no en DTOs

### Application Layer
- [ ] `application/port/in/` con input port interfaces
- [ ] `application/port/out/` con output port interfaces
- [ ] `application/service/` con servicios (max 5 métodos públicos cada uno)
- [ ] `application/dto/` con transfer objects
- [ ] Validaciones en @RequestBody, no en domain

### Infrastructure Layer
- [ ] `infrastructure/controller/` con REST endpoints
- [ ] `infrastructure/persistence/` con JpaRepository + Adapter
- [ ] `infrastructure/persistence/mapper/` con Entity↔Domain mapping
- [ ] Controllers inyectan ports (no servicios concretos)
- [ ] Adapters implementan output ports

### Tests
- [ ] Capa domain: unit tests sin mocks
- [ ] Capa application: unit tests con mocks de ports
- [ ] Capa infrastructure: integration tests con @DataJpaTest

### Nombres Canónicos
- ✅ `<Entity>UseCase`, `<Entity>Service` ✓
- ❌ NO `<Entity>Facade`, `<Entity>Manager`, `<Entity>Handler`
- ❌ NO `service/` en raíz (va en `application/service/`)
- ❌ NO `repository/` en raíz (va en `infrastructure/persistence/`)

---

## 🚫 Antipatrones PROHIBIDOS

| ❌ PROHIBIDO | ✅ CORRECTO |
|---|---|
| `modules/rate/service/` | `modules/rate/application/service/` |
| `modules/rate/RateFacade` | `modules/rate/application/service/RateManagement/QueryService` |
| `modules/rate/repository/` | `modules/rate/infrastructure/persistence/` |
| Servicios >5 métodos públicos | Múltiples servicios enfocados por caso de uso |
| Repository en domain | Repository en infrastructure |
| Controllers con lógica de negocio | Lógica en application layer |
| DTOs expuestos como entities | DTOs de entrada/salida + Mappers |

---

## 📝 Ejemplo Completo: Agregar Nuevo Endpoint

**Requerimiento:** "Crear endpoint para calcular precio de estacionamiento"

### Paso 1: Definir Input Port
```java
// application/port/in/CalculatePricingUseCase.java
public interface CalculatePricingUseCase {
    PriceCalculationResponse calculate(PriceCalculationRequest request);
}
```

### Paso 2: Definir Output Ports (si necesita)
```java
// application/port/out/RateRepositoryPort.java (YA EXISTE)
// application/port/out/TaxRepositoryPort.java (NUEVA si aplica)
```

### Paso 3: Crear Service
```java
// application/service/PricingCalculationService.java
@Service
@RequiredArgsConstructor
public class PricingCalculationService implements CalculatePricingUseCase {
    private final RateRepositoryPort rateRepository;
    private final AuditRepositoryPort auditRepository;

    @Override
    public PriceCalculationResponse calculate(PriceCalculationRequest request) {
        // Lógica...
        return ...
    }
}
```

### Paso 4: Crear DTOs
```java
// application/dto/PriceCalculationRequest.java
// application/dto/PriceCalculationResponse.java
```

### Paso 5: Crear Controller
```java
// infrastructure/controller/RateController.java (YA EXISTE)
@PostMapping("/calculate")
public ResponseEntity<PriceCalculationResponse> calculatePrice(
        @RequestBody @Valid PriceCalculationRequest request) {
    return ResponseEntity.ok(calculatePricingUseCase.calculate(request));
}
```

### Paso 6: Tests
```java
// test/application/PricingCalculationServiceTest.java
// test/infrastructure/RateControllerTest.java
```

---

## 🔗 Referencias Cruzadas

- [ANTIPATTERNS.md](ANTIPATTERNS.md) — Patrones prohibidos en detalle
- [CLAUDE.md](../../CLAUDE.md) — Standards enforzables
- [STRUCTURAL_COMPLIANCE_REPORT.md](../STRUCTURAL_COMPLIANCE_REPORT.md) — Estado actual de compliance

---

**Última actualización:** 27 de junio de 2026  
**Auditoría:** Todos los 17 módulos cumplen esta estructura
