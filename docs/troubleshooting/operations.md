# Troubleshooting: Parking Operations

## Symptoms
- Vehicle entry fails with `400 Bad Request`.
- Exit cannot find an active session.
- Payment calculation is incorrect.
- Lost ticket processing rejected.

## Checkpoints

### 1. Vehicle Entry
- **Duplicate Plate:** Check if the vehicle already has an active session.
- **Validation:** Ensure the `plate` field is not empty and follows the required format.
- **Rate Configuration:** Verify that a default rate is active in the database.

### 2. Vehicle Exit
- **Ticket Status:** Ensure the ticket hasn't been already closed or cancelled.
- **Clock Sync:** Large discrepancies between client and server time can cause calculation errors.
- **Cash Session:** If the cash policy is strict, the operation will fail if no cash session is open for the current user/device.

### 3. Lost Ticket
- **Permissions:** Only users with `ROLE_MANAGER` or `ROLE_ADMIN` can process lost tickets.
- **Configuration:** Check the `lost_ticket_fee` in the settings module.

## Common Fixes
- Check logs for `OperationException` details.
- Verify active sessions in the database: `SELECT * FROM parking_sessions WHERE status = 'ACTIVE';`.
- Ensure the user has an open cash session: `GET /api/v1/cash/policy`.
