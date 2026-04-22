# Arquitectura general

Parkflow usa un monorepo con tres apps principales:
- Desktop (Tauri): UX local, hardware, offline-first.
- Web (Next.js): panel admin y reportes.
- API (Spring Boot): dominio central, auth, auditoria y sync.

El objetivo es separar responsabilidades sin romper el flujo actual del MVP.

## Contratos y versionado

- Ver especificacion congelada v1 de impresion offline-first en `docs/architecture/offline-printing-v1.md`.
- Mapa de entidades e idempotencia: `docs/architecture/domain-contracts-v1.md`.
- Auditoria main vs develop y brechas de produccion: `docs/architecture/production-readiness-audit.md`.
- Roadmap post-integracion (prioridad `develop`, fases P0–P2): `docs/architecture/roadmap-implementacion.md`.
- Prisma en web vs esquema Flyway del API: `docs/architecture/prisma-vs-api-schema.md`.
