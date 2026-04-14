# Desarrollo local

## Requisitos
- Node 20+
- pnpm
- Java 21
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
pnpm dev:api
```

Este comando configura `JAVA_HOME` automaticamente en Windows si detecta Java 21.

Alternativa directa:

```bash
apps/api/gradlew.bat bootRun
```
