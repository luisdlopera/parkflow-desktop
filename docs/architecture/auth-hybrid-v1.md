# Auth híbrida Parkflow v1

## Objetivo

Autenticación de usuario real para operación desktop-first, con sesión persistente, refresh rotatorio, RBAC, auditoría y ventana offline controlada.

## Modelo

### Roles
- SUPER_ADMIN
- ADMIN
- CAJERO
- OPERADOR
- AUDITOR

### Permisos base
- tickets:emitir
- tickets:imprimir
- cobros:registrar
- anulaciones:crear
- tarifas:leer
- tarifas:editar
- usuarios:leer
- usuarios:editar
- cierres_caja:abrir
- cierres_caja:cerrar
- reportes:leer
- configuracion:leer
- configuracion:editar
- sync:push
- sync:reconcile
- devices:autorizar
- devices:revocar

## Flujo online

1. El cliente envía `LoginRequest` con credenciales y fingerprint del equipo.
2. API valida password, autoriza dispositivo y crea `auth_sessions`.
3. El API emite:
- access token JWT corto
- refresh token rotatorio
- `SessionInfo`
- `DeviceInfo`
- `OfflineLease`
4. El cliente guarda la sesión en storage seguro del sistema en desktop; en web usa almacenamiento browser como degradación controlada.
5. Cada request usa `Authorization: Bearer <access>` y conserva `X-API-Key` solo para compatibilidad de cliente técnico.
6. El refresh rota la sesión y revoca el token anterior.

## Flujo offline

1. Si el usuario ya inició sesión y el lease offline sigue vigente, la UI permite operaciones restringidas.
2. Las operaciones offline se marcan con `origin=OFFLINE_PENDING_SYNC`.
3. El cliente encola eventos locales con metadatos mínimos:
- userId
- deviceId
- sessionId
- timestamp
- eventType
4. Al volver la conectividad, el sync agent publica los eventos al API y el API conserva auditoría de sincronización.

## Controles de seguridad

- Access token corto: 15 min por defecto.
- Refresh token rotatorio: 7 días por defecto.
- Offline lease: 48 h por defecto, configurable.
- Password hashing: BCrypt 12 rounds.
- Revocación de dispositivo: invalida uso futuro y puede cortar sesiones.
- Sesiones persistidas en `auth_sessions` con hash del refresh token.
- Auditoría persistente en `auth_audit_log`.

## Tablas

- `app_user`: agrega `password_hash` y `password_changed_at`.
- `authorized_devices`: equipo autorizado/revocado.
- `auth_sessions`: sesión y refresh rotatorio.
- `auth_audit_log`: auditoría de auth y device events.
- `sync_events`: agrega metadata de origen y actor.

## Variables de entorno

API:
- `PARKFLOW_API_KEY`
- `PARKFLOW_JWT_SECRET_BASE64`
- `PARKFLOW_ACCESS_TOKEN_TTL_MINUTES`
- `PARKFLOW_REFRESH_TOKEN_TTL_DAYS`
- `PARKFLOW_OFFLINE_LEASE_HOURS`
- `CORS_ALLOWED_ORIGINS`

Web/Desktop:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_AUTH_BASE_URL`
- `NEXT_PUBLIC_API_KEY`
- `NEXT_PUBLIC_DEVICE_ID`
- `NEXT_PUBLIC_DEVICE_NAME`
- `NEXT_PUBLIC_DEVICE_PLATFORM`
- `NEXT_PUBLIC_DEVICE_FINGERPRINT`

## Notas

- `X-API-Key` ya no reemplaza el login de usuario.
- El modo offline limita acciones críticas; no habilita administración de usuarios ni cambios globales de tarifas/configuración.
