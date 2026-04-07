# Parkflow Desktop

Sistema de gestion de parqueadero desktop-first para Windows, pensado para parqueaderos pequenos y medianos.

## Objetivo
- Desktop con Tauri 2 y Next.js
- Persistencia desde el inicio con PostgreSQL + Prisma
- Preparado para crecer a multi-caja, red local y sincronizacion futura

## Stack
- Tauri 2
- Next.js (App Router)
- TypeScript strict
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- React Hook Form + Zod

## Estructura base
- src/ app Next.js y UI
- src-tauri/ contenedor desktop
- prisma/ esquema y seed
- src/modules/ dominio y reglas de negocio

## Desarrollo local
1) Configura variables

```
copy .env.example .env
```

2) Levanta PostgreSQL en Docker

```
pnpm db:up
```

3) Migraciones y seed

```
pnpm prisma:migrate
pnpm prisma:seed
```

4) Iniciar dev (Next + Tauri)

```
pnpm dev
```

## Produccion
- Docker NO es requisito para el cliente final.
- En produccion se usa PostgreSQL nativo instalado en el equipo.
- La app desktop se empaca con Tauri y se conecta a la base local.

## Scripts utiles
- dev: Tauri + Next
- dev:web: solo Next
- db:up / db:down: Postgres en Docker (solo dev)
- prisma:migrate: migraciones
- prisma:seed: seed inicial
- build:desktop: build Tauri

## Riesgos tecnicos y mitigaciones
1) Prisma requiere runtime Node.
   - Mitigacion: ejecutar Next/Prisma como proceso local controlado por Tauri (sidecar Node).
2) Next.js en desktop requiere build y arranque controlado.
   - Mitigacion: usar build de Next y ejecutar server local controlado por Tauri.

## Notas
- No se usa backend separado ni microservicios.
- Arquitectura monolitica local lista para evolucionar.
