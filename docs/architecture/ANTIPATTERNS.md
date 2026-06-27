# Antipatrones Prohibidos en ParkFlow

**Estado:** ✅ Enforced across 17 modules (2026-06-27)  
**Severidad:** Los violarás = rechazo en code review  
**Referencias:** [CLAUDEE.md - Architectural Standards](../../CLAUDE.md)

---

## 📋 Tabla de Contenidos

1. [Directory Structure](#directory-structure)
2. [Service Design](#service-design)
3. [Dependency Injection](#dependency-injection)
4. [Layer Responsibilities](#layer-responsibilities)
5. [Data Exposure](#data-exposure)
6. [Naming Conventions](#naming-conventions)
7. [Testing](#testing)
8. [Code Quality](#code-quality)

---

## 1. Directory Structure

### ❌ PROHIBIDO: `service/` en raíz de módulo

```
❌ modules/parking/
   └── service/                    ← INCORRECTO
       ├── ParkingSessionService.java
       └── OperationService.java
```

**Problema:** Viola estructura hexagonal. Service es implementation detail.

**Acción Correcta:**
```
✅ modules/parking/
   ├── application/
   │   ├── port/in/
   │   │   ├── OpenSessionUseCase.java
   │   │   └── CloseSessionUseCase.java
   │   └── service/                ← Service dentro de application
   │       ├── OpenSessionService.java
   │       └── CloseSessionService.java
   ├── domain/
   └── infrastructure/
```

**Por qué:** Application layer define contratos (ports), service es solo implementación.

**Cómo verificar:**
```bash
find apps/api/src/main/java/com/parkflow/modules -type d -name "service" \
  | grep -v "application/service" | grep -v "infrastructure/persistence" \
  | wc -l
# Debe retornar 0
```

---

### ❌ PROHIBIDO: `repository/` en raíz de módulo

```
❌ modules/rate/
   ├── repository/                 ← INCORRECTO
   │   ├── RateRepository.java
   │   └── RateRepositoryImpl.java
   └── service/
```

**Problema:** Repositories son adaptadores de infrastructure, no del root.

**Acción Correcta:**
```
✅ modules/rate/
   ├── application/
   │   └── port/out/
   │       └── RateRepositoryPort.java   ← Interfaz (contrato)
   ├── domain/
   └── infrastructure/
       └── persistence/                  ← Implementación
           ├── RateJpaRepository.java
           ├── RateRepositoryAdapter.java
           └── mapper/
               └── RateMapper.java
```

**Por qué:** Port define qué necesita (contrato), adapter implementa cómo (detalles).

---

### ❌ PROHIBIDO: `presentation/` layer

```
❌ modules/billing/
   ├── presentation/               ← INCORRECTO (legacy)
   │   └── BillingController.java
```

**Problema:** Nombre ambiguo/desactualizado.

**Acción Correcta:**
```
✅ modules/billing/
   └── infrastructure/
       └── controller/             ← Controllers son en infrastructure
           └── BillingController.java
```

**Por qué:** "Presentation" es vago. "Infrastructure" es preciso: es un adapter técnico.

---

## 2. Service Design

### ❌ PROHIBIDO: Servicios >5 métodos públicos (God Services)

```java
❌ @Service
public class CashSessionService {
    public CashSession open(OpenCashRequest req) { ... }
    public CashSession close(CloseCashRequest req) { ... }
    public CashMovement registerMovement(MovementRequest req) { ... }
    public Page<CashSession> list(Pageable p) { ... }
    public CashSession getById(UUID id) { ... }
    public CashSummary getSummary(UUID sessionId) { ... }       // 6 métodos = DEMASIADO
    public List<CashAuditEntry> getAuditTrail(UUID sessionId) { ... }
}
```

**Problema:** Mezcla múltiples responsabilidades. Difícil de testear, mantener y entender.

**Acción Correcta:**
```java
✅ @Service
public class OpenCashSessionService implements OpenCashSessionUseCase {
    public CashSession open(OpenCashRequest req) { ... }
    // 1 responsabilidad: abrir sesión
}

✅ @Service
public class CloseCashSessionService implements CloseCashSessionUseCase {
    public CashSession close(CloseCashRequest req) { ... }
    // 1 responsabilidad: cerrar sesión
}

✅ @Service
public class CashSessionQueryService implements CashSessionQueryUseCase {
    public Page<CashSession> list(Pageable p) { ... }
    public CashSession getById(UUID id) { ... }
    public CashSummary getSummary(UUID sessionId) { ... }
    // Máximo 5: queries (lectura sin efectos)
}

✅ @Service
public class CashMovementService implements RegisterCashMovementUseCase {
    public CashMovement registerMovement(MovementRequest req) { ... }
    // 1 responsabilidad: registrar movimiento
}
```

**Por qué:**
- ✅ Cada servicio = 1 caso de uso = 1 entrada al sistema
- ✅ Testing: fácil de mockar puertos
- ✅ Mantenimiento: cambios aislados a un servicio
- ✅ Escalabilidad: splits naturales cuando crece el negocio

**Cómo verificar:** En code review, contar métodos públicos. Si >5, rechazar.

---

### ❌ PROHIBIDO: `*FacadeService`

```java
❌ @Service
public class CashSessionFacadeService {
    // Agregador de múltiples casos de uso
    public OpenSessionResult openSession(...) { ... }
    public CloseSessionResult closeSession(...) { ... }
    public MovementResult registerMovement(...) { ... }
    // ... síndrome de dios
}
```

**Problema:** Facade oculta estructura clara. Imposible de testear en aislamiento.

**Acción Correcta:**
```java
✅ // Sin facade. Cada servicio es una entrada clara.
// Controller inyecta múltiples use cases:

@RestController
public class CashController {
    private final OpenCashSessionUseCase openUseCase;
    private final CloseCashSessionUseCase closeUseCase;
    private final RegisterCashMovementUseCase movementUseCase;

    @PostMapping("/open")
    public ResponseEntity<CashSession> open(@RequestBody OpenCashRequest req) {
        return ResponseEntity.ok(openUseCase.open(req));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<CashSession> close(@PathVariable UUID id, @RequestBody CloseCashRequest req) {
        return ResponseEntity.ok(closeUseCase.close(id, req));
    }

    // Cada endpoint = una responsabilidad clara
}
```

**Por qué:** Facade oculta qué puede hacer el módulo. Puertos claros = API entendible.

---

### ❌ PROHIBIDO: Servicios sin interfaces (puertos)

```java
❌ @Service
public class RateService {  // ← Sin interfaz
    public Rate create(CreateRateRequest req) { ... }
}

// Controller lo inyecta directo:
@RestController
public class RateController {
    private final RateService service;  // ← Acoplado a implementación
}
```

**Problema:** Tight coupling. Testing requiere clase real, no mock.

**Acción Correcta:**
```java
✅ // Input port (contrato)
public interface CreateRateUseCase {
    RateResponse create(CreateRateRequest request);
}

// Service (implementación)
@Service
public class RateService implements CreateRateUseCase {
    public RateResponse create(CreateRateRequest req) { ... }
}

// Controller (desacoplado de implementación)
@RestController
public class RateController {
    private final CreateRateUseCase createUseCase;  // ← Inyecta interfaz
}
```

**Por qué:** Ports = contratos = testeable sin conocer implementación.

---

## 3. Dependency Injection

### ❌ PROHIBIDO: Field injection

```java
❌ @Service
public class RateService {
    @Autowired  // ← PROHIBIDO
    private RateRepositoryPort repository;

    @Autowired
    private AuditService audit;
}
```

**Problema:**
- Difícil de testear (no puedo inyectar mocks en tests)
- Dependencias ocultas
- Order of initialization frágil

**Acción Correcta:**
```java
✅ @Service
public class RateService {
    private final RateRepositoryPort repository;
    private final AuditService audit;

    // Constructor injection (Spring automáticamente inyecta)
    public RateService(RateRepositoryPort repository, AuditService audit) {
        this.repository = repository;
        this.audit = audit;
    }

    // O con @RequiredArgsConstructor (Lombok):
}

✅ @Service
@RequiredArgsConstructor  // Genera constructor para fields final
public class RateService {
    private final RateRepositoryPort repository;
    private final AuditService audit;
}
```

**Por qué:**
- ✅ Testing: fácil mockar
- ✅ Transparencia: dependencias visibles
- ✅ Inmutabilidad: fields final

---

## 4. Layer Responsibilities

### ❌ PROHIBIDO: Business logic en controllers

```java
❌ @RestController
public class RateController {
    private final RateJpaRepository repo;

    @PostMapping
    public ResponseEntity<RateResponse> create(@RequestBody CreateRateRequest req) {
        // ❌ Lógica de negocio en controller
        Rate rate = new Rate();
        rate.setPrice(req.getPrice());
        if (rate.getPrice().compareTo(BigDecimal.ZERO) <= 0) {  // ← Validación
            throw new BadRequestException("Price must be positive");
        }
        Rate saved = repo.save(rate);
        return ResponseEntity.ok(toResponse(saved));
    }
}
```

**Problema:** Cambiar lógica requiere cambiar controller. Imposible testear sin HTTP.

**Acción Correcta:**
```java
✅ @RestController
public class RateController {
    private final CreateRateUseCase createUseCase;

    @PostMapping
    public ResponseEntity<RateResponse> create(@RequestBody @Valid CreateRateRequest req) {
        // ✅ Controller SOLO orquesta
        RateResponse response = createUseCase.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

✅ @Service
public class RateService implements CreateRateUseCase {
    private final RateRepositoryPort repository;

    @Override
    public RateResponse create(CreateRateRequest request) {
        // ✅ Lógica en service, testeable sin HTTP
        Rate rate = Rate.create(
            request.getCompanyId(),
            request.getStartDate(),
            request.getEndDate(),
            request.getPrice()
        );
        repository.save(rate);
        return toResponse(rate);
    }
}
```

**Por qué:** Controllers = HTTP details. Logic = testeable sin HTTP.

---

### ❌ PROHIBIDO: Business logic en DTOs/Entities

```java
❌ @Entity
public class RateEntity {
    private BigDecimal price;

    public void applyDiscount(BigDecimal percent) {  // ← Business logic
        this.price = this.price.multiply(
            BigDecimal.ONE.subtract(percent.divide(BigDecimal.valueOf(100)))
        );
    }
}
```

**Problema:** Logic acoplada a persistencia. DTOs son para transfer, no logic.

**Acción Correcta:**
```java
✅ public class Rate {  // Domain object (no JPA)
    private final BigDecimal price;

    public Rate applyDiscount(BigDecimal percent) {
        BigDecimal discountedPrice = price.multiply(
            BigDecimal.ONE.subtract(percent.divide(BigDecimal.valueOf(100)))
        );
        return new Rate(..., discountedPrice);  // Immutable
    }
}

✅ @Entity  // Solo mapeo a BD, sin lógica
public class RateEntity {
    @Column(nullable = false)
    private BigDecimal price;
    // Getters/Setters para JPA, sin lógica
}
```

**Por qué:** Domain = puro. Entities = ORM. Separación clara.

---

### ❌ PROHIBIDO: Database queries en service sin abstraction

```java
❌ @Service
public class RateService {
    private final RateJpaRepository jpaRepository;

    public List<Rate> find(LocalDate start, LocalDate end) {
        return jpaRepository.findByDateRange(start, end);  // ← Acoplado a JPA
    }
}
```

**Problema:** Service conoce JPA. Cambiar BD requiere cambiar service.

**Acción Correcta:**
```java
✅ // Output port (contrato de persistencia)
public interface RateRepositoryPort {
    List<Rate> findByDateRange(LocalDate start, LocalDate end);
}

// Service (desacoplado de JPA)
@Service
public class RateService {
    private final RateRepositoryPort repository;  // ← Interfaz, no JPA

    public List<Rate> find(LocalDate start, LocalDate end) {
        return repository.findByDateRange(start, end);
    }
}

// Adapter (implementa puerto con JPA)
@Component
public class RateRepositoryAdapter implements RateRepositoryPort {
    private final RateJpaRepository jpaRepository;

    @Override
    public List<Rate> findByDateRange(LocalDate start, LocalDate end) {
        return jpaRepository.findByDateRange(start, end)
            .stream()
            .map(this::toDomain)
            .toList();
    }
}
```

**Por qué:** Ports = abstracción. Service no sabe si es JPA, MongoDB, REST.

---

## 5. Data Exposure

### ❌ PROHIBIDO: Retornar entities directamente

```java
❌ @RestController
public class RateController {
    @GetMapping("/{id}")
    public ResponseEntity<RateEntity> getById(@PathVariable UUID id) {  // ← Entity
        return ResponseEntity.ok(repository.findById(id));
    }
}
```

**Problema:**
- API expone detalles de persistencia
- Cliente acoplado a estructura de Entity
- Cambiar entity = cambiar API

**Acción Correcta:**
```java
✅ @RestController
public class RateController {
    @GetMapping("/{id}")
    public ResponseEntity<RateResponse> getById(@PathVariable UUID id) {  // ← DTO
        Rate rate = rateRepository.findById(id)
            .orElseThrow(() -> new RateNotFoundException(id));
        return ResponseEntity.ok(toResponse(rate));
    }

    private RateResponse toResponse(Rate rate) {
        return new RateResponse(
            rate.getId(),
            rate.getCompanyId(),
            rate.getPrice()
            // Solo campos públicos
        );
    }
}
```

**Por qué:** DTOs = contrato API. Entities = implementación interna.

---

### ❌ PROHIBIDO: Setters en domain entities (mutabilidad)

```java
❌ public class Rate {
    private BigDecimal price;

    public void setPrice(BigDecimal price) {  // ← Mutable
        this.price = price;
    }
}

// Uso problemático:
Rate rate = repository.findById(id);
rate.setPrice(BigDecimal.valueOf(99.99));  // ← Modified sin auditoría
```

**Problema:** Estado mutable. Cambios sin control. Imposible rastrear.

**Acción Correcta:**
```java
✅ public class Rate {
    private final BigDecimal price;  // ← Immutable

    private Rate(UUID id, UUID companyId, BigDecimal price, ...) {
        this.price = price;
    }

    // Factory method
    public static Rate create(UUID companyId, BigDecimal price) {
        return new Rate(UUID.randomUUID(), companyId, price);
    }

    // Retorna NUEVO objeto (no modifica this)
    public Rate updatePrice(BigDecimal newPrice) {
        return new Rate(this.id, this.companyId, newPrice, ...);
    }
}

// Uso controlado:
Rate rate = repository.findById(id);
Rate updated = rate.updatePrice(BigDecimal.valueOf(99.99));  // ← Nuevo objeto
repository.save(updated);  // ← Cambio explícito
```

**Por qué:** Immutability = predictabilidad, testeable, thread-safe.

---

## 6. Naming Conventions

### ❌ PROHIBIDO: Nombres vagos

| ❌ Prohibido | ✅ Correcto | Por qué |
|---|---|---|
| `UserService` | `UserManagementService`, `UserQueryService` | Específico: qué hace |
| `RateManager` | `RateManagementService` | Consistente: service > manager |
| `ConfigController` | `RateController` | Dominio específico, no genérico |
| `CommonUtil` | `DateValidationUtil`, `PriceCalculationUtil` | Claro: qué utilidad es |
| `process()` | `calculatePrice()`, `validateRate()` | Específico: qué procesa |

---

### ❌ PROHIBIDO: `get` para operaciones costosas

```java
❌ public class RateService {
    public List<Rate> getAll() {  // ← "get" sugiere O(1)
        return repository.fetchAllFromDB()  // ← Pero es O(n) costoso
            .stream()
            .filter(...)
            .map(...)
            .collect(...);
    }
}
```

**Acción Correcta:**
```java
✅ public class RateService {
    public List<Rate> fetchAll() {  // ← "fetch" = costoso
        ...
    }

    public Optional<Rate> getById(UUID id) {  // ← "get" = cache/memory
        ...
    }
}
```

**Por qué:** Convención. `get` = rápido. `fetch` = costoso.

---

## 7. Testing

### ❌ PROHIBIDO: Tests sin assertion clara

```java
❌ @Test
public void testCreateRate() {
    RateResponse response = service.create(request);
    assertNotNull(response);  // ← Demasiado genérico
}
```

**Acción Correcta:**
```java
✅ @Test
public void testCreateRate_PriceIsSet() {
    // Arrange
    CreateRateRequest request = new CreateRateRequest(
        UUID.randomUUID(), LocalDate.now(), LocalDate.now().plusDays(30),
        BigDecimal.valueOf(50.00)
    );

    // Act
    RateResponse response = service.create(request);

    // Assert
    assertEquals(request.getPrice(), response.getPrice());
    assertNotNull(response.getId());
}

✅ @Test
public void testCreateRate_InvalidPrice_Throws() {
    CreateRateRequest request = new CreateRateRequest(
        UUID.randomUUID(), LocalDate.now(), LocalDate.now().plusDays(30),
        BigDecimal.ZERO  // ← Inválido
    );

    // Assert
    assertThrows(InvalidRateException.class, () -> service.create(request));
}
```

**Por qué:** Tests = documentación. Clear assertion = clear test.

---

## 8. Code Quality

### ❌ PROHIBIDO: `TODO`, `FIXME`, código comentado

```java
❌ @Service
public class RateService {
    public RateResponse create(CreateRateRequest request) {
        // TODO: Validar overlap con rates existentes
        // FIXME: Esta lógica es duplicada con RatePricingService
        // Rate rate = new Rate(request);  // ← Código comentado
        return null;
    }
}
```

**Acción Correcta:**
- ✅ Si es pendiente urgente → issue en GitHub
- ✅ Si es refactor → crear PR separado
- ✅ Si código comentado → eliminarlo (git history tiene backup)

```java
✅ @Service
public class RateService {
    public RateResponse create(CreateRateRequest request) {
        validateOverlapWithExistingRates(request);  // ← Implementado
        Rate rate = Rate.create(request);
        return toResponse(repository.save(rate));
    }
}
```

**Por qué:** TODOs crean deuda acumulada. Código comentado confunde.

---

### ❌ PROHIBIDO: Magic numbers/strings

```java
❌ if (price.compareTo(BigDecimal.valueOf(100)) > 0) {  // ← Magic
    return "PREMIUM";  // ← Magic string
}
```

**Acción Correcta:**
```java
✅ private static final BigDecimal PREMIUM_THRESHOLD = BigDecimal.valueOf(100);
private static final String RATE_TYPE_PREMIUM = "PREMIUM";

if (price.compareTo(PREMIUM_THRESHOLD) > 0) {
    return RATE_TYPE_PREMIUM;
}

// O enums:
public enum RateType {
    BASIC, PREMIUM, ENTERPRISE;
}
```

---

## ✅ Checklist Pre-Commit

Antes de hacer push, verifica:

- [ ] Cero `service/` en raíz de módulos (solo `application/service/`)
- [ ] Cero `repository/` en raíz (solo `infrastructure/persistence/`)
- [ ] Cero `presentation/` (es `infrastructure/controller/`)
- [ ] Cero servicios >5 métodos públicos
- [ ] Cero Facades (`*FacadeService`)
- [ ] Cero field injection (`@Autowired` en fields)
- [ ] Cero business logic en controllers
- [ ] Cero entities expuestas en API (solo DTOs)
- [ ] Cero `TODO`, `FIXME`, código comentado
- [ ] Cero magic numbers (usa constantes/enums)
- [ ] Cero field mutations (domain entities immutables)
- [ ] Todos los services implementan input ports
- [ ] Cero JPA en application layer (solo infrastructure)

---

## 🔗 Véase También

- [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md) — Cómo hacerlo bien
- [CLAUDDE.md → Service Decomposition](../../CLAUDE.md) — Reglas de descomposición
- [STRUCTURAL_COMPLIANCE_REPORT.md](../STRUCTURAL_COMPLIANCE_REPORT.md) — Estado actual

---

**Última actualización:** 27 de junio de 2026  
**Enforcement:** Code review rechaza violaciones de estos antipatrones
