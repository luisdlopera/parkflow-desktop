package com.parkflow.modules.auth.entity;

public enum AuthPermission {
  TICKETS_EMITIR("tickets:emitir"),
  TICKETS_IMPRIMIR("tickets:imprimir"),
  COBROS_REGISTRAR("cobros:registrar"),
  ANULACIONES_CREAR("anulaciones:crear"),
  TARIFAS_LEER("tarifas:leer"),
  TARIFAS_EDITAR("tarifas:editar"),
  USUARIOS_LEER("usuarios:leer"),
  USUARIOS_EDITAR("usuarios:editar"),
  CIERRES_CAJA_ABRIR("cierres_caja:abrir"),
  CIERRES_CAJA_CERRAR("cierres_caja:cerrar"),
  REPORTES_LEER("reportes:leer"),
  CONFIGURACION_LEER("configuracion:leer"),
  CONFIGURACION_EDITAR("configuracion:editar"),
  SYNC_PUSH("sync:push"),
  SYNC_RECONCILE("sync:reconcile"),
  DEVICES_AUTORIZAR("devices:autorizar"),
  DEVICES_REVOCAR("devices:revocar");

  private final String authority;

  AuthPermission(String authority) {
    this.authority = authority;
  }

  public String authority() {
    return authority;
  }
}
