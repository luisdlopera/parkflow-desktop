# Runbook: autenticación híbrida y operación offline

## Pruebas funcionales

1. Login correcto:
- Credenciales válidas.
- Equipo autorizado.
- Verificar `accessToken`, `refreshToken`, `SessionInfo`, `OfflineLease`.

2. Refresh:
- Forzar expiración del access token.
- Confirmar rotación de refresh token y auditoría `REFRESH`.

3. Logout:
- Cerrar sesión desde la UI o endpoint.
- Confirmar invalidación de sesión y auditoría `LOGOUT`.

4. Revocación de sesión:
- Revocar dispositivo o sesión.
- Confirmar rechazo en refresh y en login siguiente.

5. Equipo no autorizado:
- Intentar login con `deviceId` revocado.
- Debe fallar con `403`.

6. Expiración offline:
- Simular lease vencido.
- La UI debe bloquear operaciones offline.

7. Operación offline:
- Cortar internet.
- Emitir ticket o registrar cobro permitido.
- Debe encolarse evento con `origin=OFFLINE_PENDING_SYNC`.

8. Reconexión y sync:
- Restaurar conexión.
- Validar que el sync agent replique eventos pendientes y que el API registre auditoría `OFFLINE_SYNC`.

9. Permisos por rol:
- Validar acceso a tickets, cobros, anulaciones, usuarios, cierres de caja y reportes.

## Casos de fallo

- Refresh token reutilizado: la sesión debe revocarse.
- Password incorrecta: auditar `LOGIN_FAILED`.
- Device fingerprint diferente: tratarlo como nuevo equipo o revocación según política.
- Lease vencido: bloquear offline aunque exista sesión local.

## Operación recomendada

- Mantener un bootstrap account `SUPER_ADMIN` con rotación controlada.
- Revocar equipos de forma explícita al salir de servicio o ante sospecha.
- No usar credenciales compartidas por caja en producción.
