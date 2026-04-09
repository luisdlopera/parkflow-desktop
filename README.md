# Parkflow Monorepo

Plataforma de parqueaderos desktop-first preparada para crecer a web y backend escalable.

## Apps
- apps/desktop: Tauri 2 (desktop, hardware, offline, sync agent)
- apps/web: Next.js (panel admin, tarifas, usuarios, reportes)
- apps/api: Spring Boot 3 (negocio central, auth, auditoria, sync)

## Packages
- packages/ui: componentes UI compartidos (pendiente)
- packages/types: contratos y tipos compartidos (pendiente)
- packages/sdk: cliente HTTP (pendiente)

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
- La UI web actual se mantiene sin cambios funcionales.
