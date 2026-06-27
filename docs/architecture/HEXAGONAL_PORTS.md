# Puertos Hexagonales: Input & Output Ports

**Estado:** ✅ Implementado en 17/17 módulos (2026-06-27)  
**Referencia:** [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md)

---

## 📚 Introducción

Los **puertos** son las fronteras de los módulos en arquitectura hexagonal. Definen:
- **Input Ports:** QUÉ PUEDE HACER mi módulo (contratos de entrada)
- **Output Ports:** QUÉ NECESITO del exterior (contratos de salida)

Esto permite cambiar implementaciones sin modificar lógica.

```
External World (Controllers, other modules)
        ↓ calls ↓
    ┌─────────────┐
    │ Input Port  │  (contrato: qué puede hacer)
    └─────────────┘
        ↓ implements ↓
    ┌──────────────────────┐
    │ Application Service  │  (implementación)
    └──────────────────────┘
        ↓ calls ↓
    ┌─────────────┐
    │ Output Port │  (contrato: qué necesita)
    └─────────────┘
        ↓ implements ↓
   [Repository, External API, Cache]
```

---

## 🔌 Input Ports (Puertos de Entrada)

**Qué son:** Interfaces que definen los casos de uso del módulo.

**Ubicación:** `application/port/in/`

**Naming:** `<UseCase>UseCase.java` o `<Capability>PortIn.java`

**Responsabilidad:** Contrato puro, sin lógica.

### Ejemplo 1: Rate Management (módulo configuration)

```java
// application/port/in/CreateRateUseCase.java
public interface CreateRateUseCase {
    RateResponse create(CreateRateRequest request);
}

// application/port/in/UpdateRateUseCase.java
public interface UpdateRateUseCase {
    RateResponse update(UUID id, UpdateRateRequest request);
}

// application/port/in/DeleteRateUseCase.java
public interface DeleteRateUseCase {
    void delete(UUID id);
}

// application/port/in/QueryRateUseCase.java
public interface QueryRateUseCase {
    Optional<RateResponse> getById(UUID id);
    Page<RateResponse> listByCompany(UUID companyId, Pageable pageable);
}
```

**Observaciones:**
- ✅ Cada port = UN caso de uso específico
- ✅ Métodos públicos retornan DTOs, no entities
- ✅ Métodos señalan qué puede hacer el módulo
- ❌ NO incluye `save()`, `delete()`, etc. — eso es output port

### Ejemplo 2: Parking Operations (módulo parking.operation)

```java
// application/port/in/EntryUseCase.java
public interface EntryUseCase {
    OperationResultResponse registerEntry(EntryRequest request);
}

// application/port/in/ExitUseCase.java
public interface ExitUseCase {
    ReceiptResponse registerExit(ExitRequest request);
}

// application/port/in/PricingCalculationUseCase.java
public interface PricingCalculationUseCase {
    PricingResponse calculatePrice(PricingRequest request);
}

// application/port/in/SessionQueryUseCase.java
public interface SessionQueryUseCase {
    Optional<ParkingSessionResponse> getActive(String licensePlate);
    Page<ParkingSessionResponse> list(Pageable pageable);
}
```

### Ejemplo 3: Cash Sessions (módulo cash)

```java
// application/port/in/OpenCashSessionUseCase.java
public interface OpenCashSessionUseCase {
    CashSessionResponse open(OpenCashRequest request);
}

// application/port/in/CloseCashSessionUseCase.java
public interface CloseCashSessionUseCase {
    CashSessionResponse close(UUID sessionId, CashCloseRequest request);
}

// application/port/in/RegisterCashMovementUseCase.java
public interface RegisterCashMovementUseCase {
    CashMovementResponse register(UUID sessionId, CashMovementRequest request);
}

// application/port/in/CashQueryUseCase.java
public interface CashQueryUseCase {
    Optional<CashSessionResponse> getCurrent(String site, String terminal);
    Page<CashSessionResponse> listSessions(Pageable pageable);
    CashSummaryResponse getSummary(UUID sessionId);
}
```

**Regla:** Máximo 5 métodos públicos por port, idealmente 1-3.

---

## 🔌 Output Ports (Puertos de Salida)

**Qué son:** Interfaces que definen las dependencias externas que el módulo necesita.

**Ubicación:** `application/port/out/`

**Naming:** `<Entity>RepositoryPort.java` o `<Dependency>Port.java`

**Responsabilidad:** Contrato de persistencia o servicios externos.

### Ejemplo 1: Rate Repository Port (configuration)

```java
// application/port/out/RateRepositoryPort.java
public interface RateRepositoryPort {
    // Create
    void save(Rate rate);

    // Read
    Optional<Rate> findById(UUID id);
    List<Rate> findByCompany(UUID companyId);
    List<Rate> findByDateRange(LocalDate start, LocalDate end);
    
    // Update (no setter—retorna nuevo objeto)
    void update(Rate rate);

    // Delete
    void delete(UUID id);
}
```

**Observaciones:**
- ✅ Operaciones de persistencia (CRUD)
- ✅ Métodos retornan domain entities (Rate), no DTOs
- ✅ Service NO conoce si es JPA, MongoDB, REST, etc.
- ❌ NO incluye lógica de negocio

### Ejemplo 2: Audit Repository Port (usado por muchos módulos)

```java
// application/port/out/AuditRepositoryPort.java
public interface AuditRepositoryPort {
    void log(
        String entityType,
        String action,
        String details,
        UUID userId
    );

    List<AuditLogResponse> findByEntity(String entityType, UUID entityId);
    Page<AuditLogResponse> findByUser(UUID userId, Pageable pageable);
}
```

**Usado por:** configuration, parking, cash, billing, etc.  
**Por qué:** Centralizar auditoría (en lugar de duplicarla en 10 módulos).

### Ejemplo 3: Rate Pricing External Service Port

```java
// application/port/out/ExternalPricingPort.java
public interface ExternalPricingPort {
    BigDecimal fetchMarketRate(String rateCode, LocalDate date);
    boolean isValidRate(BigDecimal price);
}
```

**Implementado en:** `infrastructure/external/ExternalPricingService.java`

**Razón:** Si mañana cambia el proveedor de precios, solo se cambia la implementación, no el service.

### Ejemplo 4: License Validation Port (licensing)

```java
// application/port/out/LicenseRepositoryPort.java
public interface LicenseRepositoryPort {
    void save(License license);
    Optional<License> findByCompanyId(UUID companyId);
    void updateActivationStatus(UUID licenseId, LicenseStatus status);
}

// application/port/out/CryptographyPort.java
public interface CryptographyPort {
    String sign(String data, String privateKey);
    boolean verify(String data, String signature, String publicKey);
}
```

**Observaciones:**
- Licensing necesita 2 output ports: repositorio + criptografía
- Criptografía es un detalle de infraestructura
- Service usa puertos, no conoce implementación

---

## 🔗 Patrón: Cómo Conectar Puertos

### Nivel 1: Service implementa Input Port

```java
@Service
@RequiredArgsConstructor
public class RateManagementService implements CreateRateUseCase {
    private final RateRepositoryPort repository;  // Output port
    private final AuditRepositoryPort audit;       // Output port

    @Override
    public RateResponse create(CreateRateRequest request) {
        // Lógica de negocio
        Rate rate = Rate.create(...);
        
        // Usa output ports (no conoce implementación)
        repository.save(rate);
        audit.log("Rate", "CREATE", "Rate created", getCurrentUserId());
        
        return toResponse(rate);
    }
}
```

### Nivel 2: Adapter implementa Output Port

```java
@Component
@RequiredArgsConstructor
public class RateRepositoryAdapter implements RateRepositoryPort {
    private final RateJpaRepository jpaRepository;
    private final RateMapper mapper;

    @Override
    public void save(Rate rate) {
        RateEntity entity = mapper.toEntity(rate);
        jpaRepository.save(entity);
    }

    @Override
    public Optional<Rate> findById(UUID id) {
        return jpaRepository.findById(id)
            .map(mapper::toDomain);
    }
}
```

### Nivel 3: Controller inyecta Input Port

```java
@RestController
@RequestMapping("/api/v1/configuration/rates")
@RequiredArgsConstructor
public class RateController {
    private final CreateRateUseCase createUseCase;     // Input port
    private final UpdateRateUseCase updateUseCase;     // Input port
    private final QueryRateUseCase queryUseCase;       // Input port

    @PostMapping
    public ResponseEntity<RateResponse> create(
            @RequestBody @Valid CreateRateRequest request) {
        RateResponse response = createUseCase.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RateResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(queryUseCase.getById(id));
    }
}
```

**Observación clave:** Controller SOLO orquesta. No conoce implementación.

---

## 🎯 Patrón: Cross-Module Dependencies

**Escenario:** El módulo `parking.operation` necesita tarifas de `configuration`.

### ❌ INCORRECTO: Acoplamiento directo

```java
❌ @Service
public class PricingService {
    private final RateService rateService;  // ← Acoplado a implementación
    
    public BigDecimal calculatePrice(...) {
        Rate rate = rateService.getRate(...);  // ← Conoce RateService
    }
}
```

**Problema:** Si configuration cambia RateService, esto se rompe.

### ✅ CORRECTO: Usar Output Port de otro módulo

```java
// En módulo parking.operation:

// Definir un puerto que depende de configuration
public interface RateQueryPort {
    Optional<Rate> findApplicable(LocalDate date, VehicleType type);
}

@Service
public class PricingService {
    private final RateQueryPort rateQuery;  // ← Interfaz, no implementación
    
    public BigDecimal calculatePrice(...) {
        Rate rate = rateQuery.findApplicable(...)  // ← Desacoplado
            .orElseThrow(() -> new RateNotFoundException());
    }
}

// En módulo configuration:
// Implementar el puerto de parking
@Component
@RequiredArgsConstructor
public class RateQueryAdapter implements parking.operation.RateQueryPort {
    private final RateRepositoryPort rateRepository;

    @Override
    public Optional<Rate> findApplicable(LocalDate date, VehicleType type) {
        return rateRepository.findByDateRange(date, date)
            .stream()
            .filter(r -> r.appliesTo(type))
            .findFirst();
    }
}
```

**Ventajas:**
- ✅ parking.operation NO importa configuration (no circular)
- ✅ configuration puede cambiar internamente sin afectar parking
- ✅ Fácil de testear: mockear RateQueryPort

---

## 📋 Checklist: Completitud de Puertos

### Para cada módulo, verificar:

**Input Ports (`application/port/in/`)**
- [ ] ✅ Existe directorio
- [ ] ✅ Mínimo 1 puerto
- [ ] ✅ Máximo 5 métodos públicos por puerto
- [ ] ✅ Nómina: `<UseCase>UseCase.java`
- [ ] ✅ Métodos retornan DTOs (nunca entities)

**Output Ports (`application/port/out/`)**
- [ ] ✅ Existe directorio
- [ ] ✅ Mínimo 1 puerto (repositorio)
- [ ] ✅ Nómina: `<Repository>RepositoryPort.java`, `<Service>Port.java`
- [ ] ✅ Métodos operan en domain entities
- [ ] ✅ Service SOLO inyecta puertos, no implementaciones

**Services (`application/service/`)**
- [ ] ✅ Implementan input port
- [ ] ✅ Inyectan output ports
- [ ] ✅ Constructor injection only
- [ ] ✅ Máximo 5 métodos públicos
- [ ] ✅ Lógica de negocio aquí, no en controller

**Adapters (`infrastructure/persistence/`)**
- [ ] ✅ Implementan output port
- [ ] ✅ Inyectan JpaRepository
- [ ] ✅ Convierten Entity ↔ Domain (mapper)

---

## 🔍 Ejemplos Reales del Código

### Módulo: `configuration`

**Input Ports:**
```
application/port/in/
├── CreateRateUseCase.java
├── UpdateRateUseCase.java
├── DeleteRateUseCase.java
└── QueryRateUseCase.java
```

**Output Ports:**
```
application/port/out/
├── RateRepositoryPort.java
├── VehicleTypeRepositoryPort.java
├── SiteRepositoryPort.java
└── AuditRepositoryPort.java
```

### Módulo: `parking.operation`

**Input Ports:**
```
application/port/in/
├── EntryUseCase.java
├── ExitUseCase.java
├── PricingCalculationUseCase.java
├── ReceiptGenerationUseCase.java
└── SessionQueryUseCase.java
```

**Output Ports:**
```
application/port/out/
├── SessionRepositoryPort.java
├── RateQueryPort.java              (depende de configuration)
├── PricingCalculationPort.java
└── AuditRepositoryPort.java
```

### Módulo: `cash`

**Input Ports:**
```
application/port/in/
├── OpenCashSessionUseCase.java
├── CloseCashSessionUseCase.java
├── RegisterCashMovementUseCase.java
└── CashQueryUseCase.java
```

**Output Ports:**
```
application/port/out/
├── CashRepositoryPort.java
├── SessionRepositoryPort.java      (depende de parking.operation)
└── AuditRepositoryPort.java
```

---

## 🎓 Patrón: Testing con Puertos

**Ventaja clave:** Mockar ports en tests, no implementaciones.

```java
// Test: RateManagementService

@ExtendWith(MockitoExtension.class)
public class RateManagementServiceTest {
    
    @Mock
    private RateRepositoryPort rateRepository;
    
    @Mock
    private AuditRepositoryPort audit;
    
    @InjectMocks
    private RateManagementService service;

    @Test
    public void testCreateRate_SuccessfullyPersists() {
        // Arrange
        CreateRateRequest request = new CreateRateRequest(...);
        ArgumentCaptor<Rate> captor = ArgumentCaptor.forClass(Rate.class);

        // Act
        RateResponse response = service.create(request);

        // Assert
        assertEquals(request.getPrice(), response.getPrice());
        verify(rateRepository).save(captor.capture());
        assertEquals(request.getPrice(), captor.getValue().getPrice());
    }

    @Test
    public void testCreateRate_InvalidPrice_Throws() {
        CreateRateRequest request = new CreateRateRequest(..., BigDecimal.ZERO);

        assertThrows(InvalidRateException.class, () -> service.create(request));
        verify(rateRepository, never()).save(any());
    }
}
```

**Beneficios:**
- ✅ Tests rápidos (no usan BD)
- ✅ NO necesitan Testcontainers
- ✅ Fácil probar casos edge

---

## 📝 Decisión de Diseño: Puerto Granular vs. Agregado

### Opción A: Puertos Granulares (RECOMENDADO)

```java
public interface CreateRateUseCase {
    RateResponse create(CreateRateRequest request);
}

public interface UpdateRateUseCase {
    RateResponse update(UUID id, UpdateRateRequest request);
}

public interface QueryRateUseCase {
    Optional<RateResponse> getById(UUID id);
    Page<RateResponse> list(Pageable pageable);
}
```

**Ventajas:**
- ✅ Cada puerto = clara entrada al módulo
- ✅ Fácil entender qué puede hacer
- ✅ Testing: mockar solo lo necesario

**Desventajas:**
- Más interfaces (mais documentación)

### Opción B: Puertos Agregados

```java
public interface RateManagementPort {
    RateResponse create(CreateRateRequest request);
    RateResponse update(UUID id, UpdateRateRequest request);
    void delete(UUID id);
    Optional<RateResponse> getById(UUID id);
    Page<RateResponse> list(Pageable pageable);
}
```

**Problema:** Viola el principio de Interface Segregation. Mezcla múltiples responsabilidades.

**Decisión en ParkFlow:** Usar Opción A (granular).

---

## 🔗 Véase También

- [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md) — Estructura general
- [ANTIPATTERNS.md](ANTIPATTERNS.md) — Antipatrones (como NO usar puertos)
- [api-modules.md](api-modules.md) — Módulos y sus puertos
- [CLAUDE.md - Hexagonal Architecture](../../CLAUDE.md) — Estándares mandatorios

---

**Última actualización:** 27 de junio de 2026  
**Compliance:** 17/17 módulos tienen input/output ports definidos
