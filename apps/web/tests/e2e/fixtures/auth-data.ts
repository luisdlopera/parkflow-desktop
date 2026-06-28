/**
 * Authentication test fixtures
 * Shared test data for E2E tests - matches backend RolePermissions exactly
 */

export const ADMIN_PERMISSIONS = [
  'tickets:emitir',
  'tickets:imprimir',
  'cobros:registrar',
  'anulaciones:crear',
  'tarifas:leer',
  'tarifas:editar',
  'usuarios:leer',
  'usuarios:editar',
  'cierres_caja:abrir',
  'cierres_caja:cerrar',
  'reportes:leer',
  'configuracion:leer',
  'configuracion:editar',
  'sync:push',
  'sync:reconcile',
  'devices:autorizar',
  'devices:revocar',
  'parking:salida_masiva',
] as const;

export const SUPPORT_PERMISSIONS = [
  'cierres_caja:abrir',
  'cierres_caja:cerrar',
  'reportes:leer',
  'usuarios:leer',
  'configuracion:leer',
  'tickets:emitir',
] as const;

export const OPERADOR_PERMISSIONS = [
  'tickets:emitir',
  'tickets:imprimir',
  'cobros:registrar',
  'anulaciones:crear',
  'sync:push',
  'sync:reconcile',
] as const;

export const CAJERO_PERMISSIONS = [
  'tickets:emitir',
  'tickets:imprimir',
  'cobros:registrar',
  'cierres_caja:abrir',
  'cierres_caja:cerrar',
  'sync:push',
  'sync:reconcile',
] as const;

export const AUDITOR_PERMISSIONS = [
  'reportes:leer',
  'usuarios:leer',
  'tarifas:leer',
  'configuracion:leer',
] as const;

export const SUPER_ADMIN_PERMISSIONS = [
  // All permissions available
  ...ADMIN_PERMISSIONS,
  // Plus SUPER_ADMIN only
  'usuarios:editar',
  'configuracion:editar',
  'devices:autorizar',
  'devices:revocar',
] as const;

export function getPermissionsForRole(role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'CAJERO' | 'OPERADOR' | 'AUDITOR') {
  return {
    SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
    ADMIN: ADMIN_PERMISSIONS,
    SUPPORT: SUPPORT_PERMISSIONS,
    CAJERO: CAJERO_PERMISSIONS,
    OPERADOR: OPERADOR_PERMISSIONS,
    AUDITOR: AUDITOR_PERMISSIONS,
  }[role];
}
