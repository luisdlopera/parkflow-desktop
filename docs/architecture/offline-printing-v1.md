# Offline Printing v1 (Frozen Contracts)

## Scope
- API version: v1
- Ticketing and print orchestration for offline-first parking operations
- Idempotent event ingestion and retry-safe print job lifecycle

## Domain Contracts (v1)
- TicketDocument
- PrintJob
- PrintResult
- SyncEvent
- DeviceConfig

Source of truth for TypeScript contracts:
- packages/types/src/index.ts

## Idempotency Rules
1. ticketId is unique per parking operation (entry session/ticket number).
2. printJob idempotency is enforced by idempotencyKey at create time.
3. print attempt idempotency is enforced by attemptKey (retry/status transition safe).
4. sync push idempotency is enforced by idempotencyKey in sync_events.

## Print Job State Machine
created -> queued -> processing -> sent -> acked -> failed -> dead_letter

## API v1 Endpoints (frozen)
### Print Jobs
- POST /api/v1/print-jobs (canonical)
- POST /api/v1/tickets/print-jobs (alias idéntico)
- GET /api/v1/print-jobs/{id}
- GET /api/v1/tickets/print-jobs/{id} (alias)
- PATCH /api/v1/print-jobs/{id}/status
- PATCH /api/v1/tickets/print-jobs/{id}/status (alias)
- POST /api/v1/print-jobs/{id}/retry
- POST /api/v1/tickets/print-jobs/{id}/retry (alias)
- GET /api/v1/print-jobs?sessionId=...|ticketNumber=...
- GET /api/v1/tickets/print-jobs?sessionId=...|ticketNumber=... (alias)

### Sync
- POST /api/v1/sync/push
- GET /api/v1/sync/pull
- POST /api/v1/sync/reconcile

## Auditability
- Print jobs are linked to parking session and operator.
- Every status transition/retry stores a print_attempts row.
- Queries by ticketNumber provide ticket-centric audit trail.
