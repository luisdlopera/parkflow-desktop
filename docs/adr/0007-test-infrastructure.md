# ADR-0007: Test Infrastructure (H2 In-Memory vs. Testcontainers)

**Status**: Accepted  
**Date**: 2026-06-25  
**Version**: 1.0  

---

## Context

Integration tests require a database. Two approaches:

1. **H2 In-Memory**: Fast, no setup, but dialect differences from PostgreSQL
2. **Testcontainers**: Real PostgreSQL in Docker, slow startup, production-accurate

Early tests used H2; late tests added Testcontainers. Inconsistent approach.

---

## Decision

**Use H2 for unit-level integration tests (fast feedback); Testcontainers for critical data paths (accuracy).**

### Tier 1: H2 Tests (Default, Most Tests)
```java
@SpringBootTest
@ActiveProfiles("test")  // Loads application-test.yml with H2
class RateManagementServiceTest {
  @Autowired RateManagementService service;
  @Autowired RateRepository repository;
  
  @Test
  void createRate_validInput_persistsAndReturns() {
    // Runs in H2 (fast, ~100ms)
    RateResponse response = service.createRate(new CreateRateRequest(...));
    assertThat(response).isNotNull();
  }
}
```

### Tier 2: Testcontainers (Critical Paths)
```java
@SpringBootTest
@Testcontainers  // Spins up real PostgreSQL
class CashSessionIntegrationTest {
  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
    DockerImageName.parse("postgres:15-alpine")
  ).withDatabaseName("parkflow_test");
  
  @Test
  void cashSession_withRLS_isolatesByCompany() {
    // Runs in real PostgreSQL (slow, ~2s)
    // Tests RLS policies, connection pooling, etc.
  }
}
```

---

## Known Dialect Differences

| Feature | H2 | PostgreSQL | Impact | Mitigation |
|---------|----|------------|--------|-----------|
| UUID type | No native support | `uuid` | Column type mismatch | Use H2 `UUID` type |
| Row-level security (RLS) | Not supported | ✅ Supported | Can't test RLS in H2 | Use Testcontainers for RLS tests |
| CITEXT (case-insensitive) | No | ✅ Supported | Email unique constraint differ | Use VARCHAR in H2 tests |
| JSON operators | Limited | Rich (`@>`, `?`, etc.) | Array queries fail in H2 | Testcontainers for JSON tests |
| Sequences | Supported | ✅ Supported | Auto-increment syntax differs | Use `@GeneratedValue` annotation |
| PARTITIONING | No | ✅ Supported | Can't test partitioned tables | Skip in H2; Testcontainers only |

---

## Test Classification

### Use H2 (Fast)
- ✅ Unit tests for business logic
- ✅ Repository CRUD operations
- ✅ Service validation & error handling
- ✅ Most controller tests

### Use Testcontainers (Accurate)
- ✅ Row-level security (RLS) policies
- ✅ JSON document queries
- ✅ Complex aggregation queries
- ✅ Database constraint enforcement
- ✅ Connection pooling behavior
- ✅ Transaction isolation testing

---

## Configuration

**application-test.yml**:
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    database-platform: org.hibernate.dialect.H2Dialect
    show-sql: false
    hibernate:
      ddl-auto: create-drop
  h2:
    console:
      enabled: true
```

---

## Test Speed Target

- **H2 suite** (1,000 tests): ~3 minutes
- **Testcontainers suite** (50 tests): ~2 minutes
- **Total**: ~5 minutes CI run time

---

## Related ADRs

- [ADR-0001: Hexagonal Architecture](0001-hexagonal-architecture.md) — Ports enable test double injection
- [ADR-0004: Multi-Tenant RLS](0004-multi-tenant-rls.md) — Requires Testcontainers for validation

---

**Last Updated**: 2026-06-25  
**Status**: ✅ Implemented (current test suite uses both)  
**Coverage**: 1,050 tests (H2) + 50 tests (Testcontainers)
