package com.parkflow.modules.auth.security;

import com.parkflow.modules.auth.domain.AuthPermission;
import com.parkflow.modules.auth.domain.UserRole;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class RolePermissions {
  private RolePermissions() {}

  private static final Set<AuthPermission> CASHIER_BASE =
      EnumSet.of(
          AuthPermission.TICKETS_EMITIR,
          AuthPermission.TICKETS_IMPRIMIR,
          AuthPermission.COBROS_REGISTRAR,
          AuthPermission.CIERRES_CAJA_ABRIR,
          AuthPermission.CIERRES_CAJA_CERRAR,
          AuthPermission.SYNC_PUSH,
          AuthPermission.SYNC_RECONCILE);

  private static final Set<AuthPermission> OPERATOR_BASE =
      EnumSet.of(
          AuthPermission.TICKETS_EMITIR,
          AuthPermission.TICKETS_IMPRIMIR,
          AuthPermission.COBROS_REGISTRAR,
          AuthPermission.ANULACIONES_CREAR,
          AuthPermission.SYNC_PUSH,
          AuthPermission.SYNC_RECONCILE);

  private static final Set<AuthPermission> ADMIN_EXTRA =
      EnumSet.of(
          AuthPermission.ANULACIONES_CREAR,
          AuthPermission.TARIFAS_LEER,
          AuthPermission.TARIFAS_EDITAR,
          AuthPermission.USUARIOS_LEER,
          AuthPermission.USUARIOS_EDITAR,
          AuthPermission.CIERRES_CAJA_ABRIR,
          AuthPermission.CIERRES_CAJA_CERRAR,
          AuthPermission.REPORTES_LEER,
          AuthPermission.CONFIGURACION_LEER,
          AuthPermission.CONFIGURACION_EDITAR,
          AuthPermission.DEVICES_AUTORIZAR,
          AuthPermission.DEVICES_REVOCAR);

  private static final Set<AuthPermission> SUPER_ADMIN_EXTRA =
      EnumSet.of(
          AuthPermission.USUARIOS_EDITAR,
          AuthPermission.CONFIGURACION_EDITAR,
          AuthPermission.DEVICES_AUTORIZAR,
          AuthPermission.DEVICES_REVOCAR);

  private static final Set<AuthPermission> AUDITOR_BASE =
      EnumSet.of(
          AuthPermission.REPORTES_LEER,
          AuthPermission.USUARIOS_LEER,
          AuthPermission.TARIFAS_LEER,
          AuthPermission.CONFIGURACION_LEER);

  public static Set<AuthPermission> permissionsFor(UserRole role) {
    return switch (role) {
      case SUPER_ADMIN -> {
        EnumSet<AuthPermission> all = EnumSet.copyOf(CASHIER_BASE);
        all.addAll(OPERATOR_BASE);
        all.addAll(ADMIN_EXTRA);
        all.addAll(SUPER_ADMIN_EXTRA);
        yield all;
      }
      case ADMIN -> {
        EnumSet<AuthPermission> set = EnumSet.copyOf(CASHIER_BASE);
        set.addAll(OPERATOR_BASE);
        set.addAll(ADMIN_EXTRA);
        yield set;
      }
      case CAJERO -> EnumSet.copyOf(CASHIER_BASE);
      case OPERADOR -> EnumSet.copyOf(OPERATOR_BASE);
      case AUDITOR -> EnumSet.copyOf(AUDITOR_BASE);
    };
  }

  public static Map<String, Object> claims(UserRole role) {
    var permissions = permissionsFor(role).stream().map(AuthPermission::authority).toList();
    return Map.of("role", role.name(), "permissions", permissions);
  }
}
