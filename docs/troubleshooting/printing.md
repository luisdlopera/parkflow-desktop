# Troubleshooting: Printing

## Symptoms
- Ticket doesn't print.
- Printing is slow.
- "Print Job Failed" error in logs.
- Duplicate tickets printed.

## Checkpoints

### 1. Connectivity
- **Desktop Agent:** Ensure the Tauri desktop app is running and connected to the hardware.
- **Queue Status:** Check `GET /api/v1/tickets/print-jobs/{id}` to see if the job is `QUEUED`, `PROCESSING`, or `FAILED`.

### 2. Idempotency
- **Keys:** Verify that `idempotencyKey` is being sent correctly by the client to prevent duplicates.
- **Retries:** Check if the desktop agent is retrying failed jobs without notifying the server.

### 3. Permissions
- **Reprint Limit:** Some users may have a limit on how many times they can reprint a ticket.

## Common Fixes
- Restart the desktop printer agent.
- Manually retry the print job: `POST /api/v1/tickets/print-jobs/{id}/retry`.
- Check local desktop logs (if available) for hardware-specific errors (out of paper, disconnected).
