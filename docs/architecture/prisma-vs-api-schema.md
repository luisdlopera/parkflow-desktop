# Prisma en `apps/web` vs esquema real del API (Flyway)

## Estado tras el merge de `main` → monorepo

- **No** quedan rutas legacy en la raiz del repo (`src/`, `prisma/`, `next.config.mjs` del layout antiguo): el codigo Next vive en `apps/web`.
- **Si** queda deuda: **dos modelos de datos** para el mismo negocio conceptual.

## Donde vive la verdad operativa hoy

- **Spring Boot + Flyway** (`apps/api`): tablas `app_user`, `vehicle`, `parking_session`, `rate`, etc. El panel de operaciones (ingreso/salida) usa **solo HTTP** contra este API.

## Que hace Prisma ahi

- `apps/web/prisma/schema.prisma` define modelos tipo `User`, `ParkingSession`, … que **no** estan mapeados (`@@map`) a las tablas Flyway.
- En PostgreSQL, Prisma crearia tablas con nombres de modelo (p. ej. `"User"`, `"ParkingSession"`) distintos de `app_user`, `parking_session`.
- El **seed** de Prisma puebla esas tablas Prisma; **no** alimenta las tablas que lee el API.
- El cliente Next **no importaba** `lib/prisma.ts` ni `lib/env.ts` (archivos huérfanos; eliminados para reducir ruido).

## Riesgos si usas la misma `DATABASE_URL` para ambos

- Correr `prisma migrate dev` o `db push` sobre la misma base que Flyway puede crear **tablas duplicadas** (otro juego de tablas) y confusion sobre cual es la fuente de verdad.
- Mantener dos esquemas sincronizados a mano es propenso a deriva.

## Recomendaciones

1. **Corto plazo:** usar `pnpm prisma:*` solo si mantienes un flujo consciente (p. ej. base dedicada solo a prototipos Prisma) **o** congelar Prisma hasta decidir.
2. **Medio plazo (mejor):** si el panel no necesita SQL directo, **eliminar** Prisma del paquete web y sembrar datos via API o scripts SQL Flyway.
3. **Alternativa:** una sola fuente: mapear modelos Prisma con `@@map` a tablas Flyway (esfuerzo de alineacion y convenciones UUID/cuid).
