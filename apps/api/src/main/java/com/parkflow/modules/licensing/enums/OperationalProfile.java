package com.parkflow.modules.licensing.enums;

/**
 * Define el perfil operacional del parqueadero (Tenant).
 * Afecta dinámicamente el comportamiento del frontend y backend mediante capacidades y políticas.
 */
public enum OperationalProfile {
  /**
   * Solo motocicletas. Oculta selección de tipo de vehículo y fuerza MOTORCYCLE.
   */
  MOTORCYCLE_ONLY,

  /**
   * Solo carros. Oculta selección de tipo de vehículo y fuerza CAR.
   */
  CAR_ONLY,

  /**
   * Mixto estándar (Carros, motos, bicicletas, etc.).
   */
  MIXED,

  /**
   * Servicio de Valet Parking. Habilita estado del vehículo y observaciones.
   */
  VALET,

  /**
   * Parqueadero residencial. Flujo enfocado en residentes y visitantes fijos.
   */
  RESIDENTIAL,

  /**
   * Parqueadero público de alta rotación. Habilita tarifas manuales, múltiples carriles y terminales.
   */
  PUBLIC,

  /**
   * Parqueadero empresarial/corporativo. Enfoque en empleados y convenios.
   */
  ENTERPRISE
}
