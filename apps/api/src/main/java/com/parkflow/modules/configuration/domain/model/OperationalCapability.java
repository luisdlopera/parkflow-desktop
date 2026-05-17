package com.parkflow.modules.configuration.domain.model;

/**
 * Define las capacidades y características operativas configurables del sistema.
 */
public enum OperationalCapability {
    /**
     * Permite seleccionar el tipo de vehículo al registrar el ingreso.
     */
    VEHICLE_TYPE_SELECTION,

    /**
     * Permite seleccionar el tipo de cliente/visitante/convenio al registrar.
     */
    VISITOR_TYPE_SELECTION,

    /**
     * Habilita la sección de campos avanzados de forma expandible.
     */
    ADVANCED_SECTION,

    /**
     * Permite sobrescribir manualmente la tarifa calculada en la salida.
     */
    MANUAL_RATE_OVERRIDE,

    /**
     * Habilita la selección de carril de ingreso/salida.
     */
    LANE_SELECTION,

    /**
     * Habilita la asignación de terminal/caja.
     */
    TERMINAL_SELECTION,

    /**
     * Habilita la selección de cajero.
     */
    CASHIER_SELECTION,

    /**
     * Habilita el control y registro de estado físico (daños) del vehículo.
     */
    VEHICLE_CONDITION_CHECK,

    /**
     * Habilita el registro de observaciones en el ticket de ingreso.
     */
    OBSERVATIONS,

    /**
     * Habilita el formateo de placas según el país seleccionado.
     */
    COUNTRY_PLATE_FORMATTING
}
