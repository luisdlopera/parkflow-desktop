# Parkflow API

Backend Spring Boot 3 (Java 21) con arquitectura modular y preparada para crecer.

## Desarrollo

```bash
pnpm dev:api
```

Este comando configura `JAVA_HOME` automaticamente en Windows si detecta Java 21.

Alternativa directa con Gradle wrapper:

```bash
apps/api/gradlew.bat bootRun
```

## Base de datos local

```bash
pnpm db:up
```

Variables por defecto:
- `POSTGRES_USER=parkflow`
- `POSTGRES_PASSWORD=parkflow`
- `POSTGRES_DB=parkflow_dev`
- `DATABASE_URL=jdbc:postgresql://localhost:5432/parkflow_dev`
- `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`

En `apps/web`, define:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1/operations`

## Swagger
- http://localhost:8080/swagger-ui/index.html

## Modulo Operacion (ingreso/salida)

Base path: `/api/v1/operations`

- `POST /entries`: registrar ingreso de vehiculo
- `POST /exits`: registrar salida y cierre
- `GET /sessions/active?ticketNumber=...|plate=...`: buscar sesion activa
- `GET /tickets/{ticketNumber}`: consultar ticket
- `POST /tickets/reprint`: reimprimir ticket (con control de limite por rol)
- `POST /tickets/lost`: procesar ticket perdido (solo manager/admin)

Migraciones Flyway:
- `src/main/resources/db/migration/V1__operations_module.sql`
