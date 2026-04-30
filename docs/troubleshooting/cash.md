# Troubleshooting: Cash & Arqueo

## Symptoms
- Cannot open cash session.
- Cannot process payment because "Cash is closed".
- Discrepancy in arqueo (closing summary).

## Checkpoints

### 1. Cash Status
- **Active Session:** Verify if the user already has an open session on another device.
- **Policy:** Check the current policy with `GET /api/v1/cash/policy`.

### 2. Movements
- **Manual Adjustments:** Check `cash_audit_log` for manual entries or exits of cash.
- **Voided Movements:** Ensure voided operations are correctly reflected in the summary.

## Common Fixes
- Force close a session if it was left open on a disconnected device (Admin required).
- Check `docs/runbooks/cash-management.md` (if available) for procedural steps.
