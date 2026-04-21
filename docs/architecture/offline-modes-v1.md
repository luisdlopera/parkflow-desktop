# Modos offline y reconciliación v1

## Clasificación

| Modo | Descripción | Comportamiento |
|------|-------------|----------------|
| Offline total | Sin heartbeat al API ni sync saliente | Operación local: SQLite (sesiones, cola de impresión, outbox). Eventos quedan en outbox hasta conectividad. |
| Offline parcial | Heartbeat intermitente o sync unidireccional | Reintentos exponenciales en outbox; impresión local no depende del API. |
| Online obligatorio | Reglas de negocio que exigen validación remota | Debe rechazarse en UI/servicio antes de confirmar operación (fuera del alcance de la cola de impresión pura). |

## Reconciliación

1. **Push idempotente**: `POST /api/v1/sync/push` con `idempotencyKey` estable.
2. **Pull**: `GET /api/v1/sync/pull?after=&limit=` para recuperar eventos del servidor ordenados por tiempo.
3. **Cierre de ciclo**: `POST /api/v1/sync/reconcile` con lista de `eventIds` procesados en el peer; marca `synced_at` de forma idempotente.

Los clientes deben persistir el cursor `after` y no asumir entrega sin confirmación en servidor.
