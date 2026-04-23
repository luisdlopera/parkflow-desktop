# Parkflow Monorepo

Plataforma de parqueaderos desktop-first preparada para crecer a web y backend escalable.

## Apps
- apps/desktop: Tauri 2 (desktop, hardware, offline, sync agent)
- apps/web: Next.js (panel admin, tarifas, usuarios, reportes)
- apps/api: Spring Boot 3 (negocio central, auth, auditoria, sync)

## Packages
- `packages/types`: contratos v1 (`TicketDocument`, print jobs, sync) y layout de preview de tiquete (`ticket-layout.ts`).
- `packages/ui` / `packages/sdk`: no definidos aun en el monorepo.

## Desarrollo rapido

```bash
pnpm dev:web
pnpm dev:desktop
```

## Base de datos local (dev)

```bash
pnpm db:up
pnpm prisma:migrate
pnpm prisma:seed
```

## Notas de migracion
- **Prisma (`apps/web/prisma`)**: legado del layout pre-merge; el negocio en produccion vive en **Flyway + JPA** (`apps/api`). El panel actual usa el API por HTTP, no Prisma. Ver riesgos y opciones en `docs/architecture/prisma-vs-api-schema.md`. No mezclar `prisma migrate`/`db push` con la misma base que Flyway sin saber que tablas crea cada uno.
- El API Spring (`apps/api`) ahora usa login de usuario con JWT corto + refresh rotatorio. `X-API-Key` queda solo como compatibilidad para clientes técnicos o protección interna, no como auth de usuario.
- Documentacion de auditoria produccion: `docs/architecture/production-readiness-audit.md` y checklist `docs/runbooks/production-validation-checklist.md`.

## Auth y offline

Ver `docs/architecture/auth-hybrid-v1.md` para el diseño completo y `docs/runbooks/auth-offline.md` para validación operativa.

Variables nuevas relevantes:
- API: `PARKFLOW_JWT_SECRET_BASE64`, `PARKFLOW_ACCESS_TOKEN_TTL_MINUTES`, `PARKFLOW_REFRESH_TOKEN_TTL_DAYS`, `PARKFLOW_OFFLINE_LEASE_HOURS`
- Web/Desktop: `NEXT_PUBLIC_AUTH_BASE_URL`, `NEXT_PUBLIC_DEVICE_ID`, `NEXT_PUBLIC_DEVICE_NAME`, `NEXT_PUBLIC_DEVICE_PLATFORM`, `NEXT_PUBLIC_DEVICE_FINGERPRINT`
