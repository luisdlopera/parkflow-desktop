# Seguridad operativa de impresión v1

## Anti-duplicado extremo a extremo

- **Entrada**: el API rechaza una segunda orden de impresión `ENTRY` para la misma sesión si ya existe un trabajo en estados activos o `ACKED` (idempotencia de creación aparte).
- **Claves**: `idempotencyKey` en creación; `attemptKey` en cada transición y reintento (`print_attempts`).
- **Cliente**: debe generar claves determinísticas por operación (`ticketId` + tipo + scope).

## Reimpresión con auditoría

- Tipo de documento `REPRINT` distinto de `ENTRY`; cada trabajo genera filas en `print_attempts` y puede asociarse a `sync_events` (`TICKET_REPRINTED`) vía push.

## Roles por terminal

- `terminalId` opcional en creación de print job y en sesión de parqueo para trazabilidad.
- La autorización fina (qué rol imprime en qué terminal) queda en la capa de auth/API; el contrato v1 preserva el identificador para auditoría.
