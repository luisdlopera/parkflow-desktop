package com.parkflow.modules.auth.security;

import com.parkflow.modules.auth.domain.AuthPermission;
import com.parkflow.modules.parking.operation.domain.UserRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RolePermissionsTest {
  @Test
  void permissionsFor_ShouldGrantExpectedAdminPermissions() {
    assertThat(RolePermissions.permissionsFor(UserRole.ADMIN))
        .contains(
            AuthPermission.TICKETS_EMITIR,
            AuthPermission.COBROS_REGISTRAR,
            AuthPermission.DEVICES_AUTORIZAR,
            AuthPermission.DEVICES_REVOCAR,
            AuthPermission.USUARIOS_EDITAR,
            AuthPermission.CONFIGURACION_EDITAR);
  }

  @Test
  void permissionsFor_ShouldLimitCashierDeviceAdministration() {
    assertThat(RolePermissions.permissionsFor(UserRole.CAJERO))
        .contains(AuthPermission.TICKETS_EMITIR, AuthPermission.CIERRES_CAJA_ABRIR)
        .doesNotContain(AuthPermission.DEVICES_AUTORIZAR, AuthPermission.DEVICES_REVOCAR);
  }

  @Test
  void claims_ShouldExposeRoleAndPermissionAuthorities() {
    assertThat(RolePermissions.claims(UserRole.SUPER_ADMIN))
        .containsEntry("role", "SUPER_ADMIN");
    assertThat(RolePermissions.claims(UserRole.SUPER_ADMIN).get("permissions"))
        .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.LIST)
        .contains("usuarios:editar", "configuracion:editar", "devices:autorizar");
  }
}
