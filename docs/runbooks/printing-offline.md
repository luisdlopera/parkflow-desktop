# Runbook: impresión offline y colas

## Señales

- **API**: `GET /actuator/health`, métricas `GET /actuator/prometheus`.
- **Desktop**: heartbeat configurable con `PARKFLOW_API_HEALTH_URL` (por defecto `http://localhost:8080/actuator/health`).
- **Logs**: buscar `audit print_job` y `audit sync_` en logs del API (MDC: `ticketNumber`, `printJobId`, `sessionId`).

## Incidentes comunes

### Sin papel / atasco

1. Ver último `print_attempts` del tiquete (`GET .../print-jobs?ticketNumber=`).
2. Corregir hardware; usar `POST .../print-jobs/{id}/retry` con nueva `idempotencyKey` de intento.
3. No marcar `ACKED` sin confirmación técnica (desktop: `hardware_confirmed` en resultado ESC/POS). Tras el trabajo, el desktop exige **byte de estado** y que **no** se reporte fin de papel duro (bit habitual en respuestas tipo `GS r` Epson-compatible). Si no hay byte o el papel está en fin, el resultado se considera **no confirmado** aunque los bytes se hayan enviado al socket/COM.

### Impresora caída / timeout TCP

1. `printer_health_esc_pos` (desktop) o prueba de puerto 9100 desde red.
2. Trabajos en `failed` → reintento; tras máximo de reintentos outbox → `dead_letter` (revisión manual).

### Crash del cliente

1. SQLite local conserva `local_print_jobs`, `outbox`, `local_print_attempts`.
2. Al reiniciar, el worker reabre reintentos de outbox cuando vence `next_retry_at_unix_ms`.

## CI

- API: `gradle -p apps/api test`
- Desktop: `cargo test` en `apps/desktop/src-tauri`
