# Desarrollo local

## Requisitos
- Node 20+
- pnpm
- Java 21
- Maven
- Docker (opcional para Postgres)

## Iniciar web

```bash
pnpm dev:web
```

## Iniciar desktop

```bash
pnpm dev:desktop
```

## Iniciar API

```bash
mvn -f apps/api/pom.xml spring-boot:run
```
