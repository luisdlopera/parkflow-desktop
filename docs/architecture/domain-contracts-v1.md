# Contratos de dominio v1 (congelados)

Fuente de verdad TypeScript: `packages/types/src/index.ts`.

## Entidades

| Contrato        | Descripción breve |
|----------------|-------------------|
| TicketDocument | Contenido lógico del tiquete (placa, consecutivo, QR, plantilla). |
| PrintJob       | Orden de impresión con ciclo de vida y claves de idempotencia. |
| PrintResult    | Resultado técnico; incluye `hardwareConfirmed` para evitar falsos positivos. |
| SyncEvent      | Evento auditable para sincronización distribuida. |
| DeviceConfig   | Configuración de impresora y transporte (TCP, serial/USB-CDC, etc.). |

## Idempotencia

| Clave              | Alcance |
|--------------------|---------|
| `ticketId`         | Único por operación de parqueo (sesión / número de tiquete). Coincide con `ticketNumber` si no hay id externo. |
| `printJob`         | Un `idempotencyKey` por trabajo lógico de impresión (creación). |
| `print attempt`    | Cada transición de estado / reintento usa `idempotencyKey` distinto en `print_attempts`. |
| `sync push`        | `idempotencyKey` único por evento en `sync_events`. |

## API v1

Prefijo: `/api/v1`.

Impresión:

- `POST /api/v1/print-jobs` (alias de `POST /api/v1/tickets/print-jobs`)
- `GET /api/v1/print-jobs/{id}`
- `POST /api/v1/print-jobs/{id}/retry`
- `PATCH /api/v1/print-jobs/{id}/status`

Sync:

- `POST /api/v1/sync/push`
- `GET /api/v1/sync/pull`
- `POST /api/v1/sync/reconcile`

## Máquina de estados (PrintJob)

`created` → `queued` → `processing` → `sent` → `acked` → `failed` → `dead_letter`

Las transiciones se registran en `print_attempts` para auditoría por tiquete.
