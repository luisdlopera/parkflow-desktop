package com.parkflow.modules.configuration.domain.policy;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;

import java.util.Map;

/**
 * Strategy/Policy central que define el comportamiento operativo para un perfil operacional determinado.
 * Permite desacoplar las validaciones, UI configurada y capacidades de forma mantenible y testeable.
 */
public interface OperationalProfilePolicy {
    
    /**
     * Obtiene el perfil operacional asociado a esta política.
     */
    OperationalProfile getProfile();
    
    /**
     * Evalúa si esta política habilita una determinada capacidad operacional.
     */
    boolean hasCapability(OperationalCapability capability);
    
    /**
     * Resuelve dinámicamente el tipo de vehículo a guardar (por ejemplo, autocompletando o mapeando).
     */
    default String resolveVehicleType(String requestedType) {
        return requestedType;
    }
    
    /**
     * Ejecuta validaciones de negocio específicas antes de registrar un ingreso.
     */
    default void validateEntry(String vehicleType, String entryMode, String lane, String terminal, String cashier) {
        // Hook opcional para validaciones adicionales
    }
    
    /**
     * Genera la configuración de UI y runtime derivada de esta política.
     */
    Map<String, Object> getDerivedConfiguration();
}
