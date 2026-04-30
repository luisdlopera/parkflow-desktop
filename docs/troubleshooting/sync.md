# Troubleshooting: Sync & Offline Mode

## Symptoms
- Desktop data doesn't appear in the Web panel.
- Sync events stuck in "PENDING".
- Conflict errors during sync push.

## Checkpoints

### 1. Sync Status
- **Events Table:** Check `SELECT count(*) FROM sync_events WHERE status = 'PENDING';`.
- **Correlation:** Match `correlationId` between the desktop sync log and the API logs.

### 2. Connectivity
- **API Availability:** Ensure the API is reachable from the desktop network.
- **Timeouts:** Long-running sync batches might be timing out at the proxy or load balancer level.

### 3. Conflicts
- **Versions:** Check if the desktop is trying to update a record that was modified directly in the cloud.

## Common Fixes
- Force a sync pull/push from the desktop "Settings" menu.
- Clear sync cache on the desktop (use with caution, only if data is backed up).
- Check `docs/architecture/auth-hybrid-v1.md` for offline lease details.
