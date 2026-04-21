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
- Prisma queda temporal en apps/web mientras se migra a Spring Boot + Flyway.
- El API Spring (`apps/api`) requiere cabecera `X-API-Key` (ver `PARKFLOW_API_KEY` / `app.security.api-key`); alinear `NEXT_PUBLIC_API_KEY` en el build web.
- Documentacion de auditoria produccion: `docs/architecture/production-readiness-audit.md` y checklist `docs/runbooks/production-validation-checklist.md`.
