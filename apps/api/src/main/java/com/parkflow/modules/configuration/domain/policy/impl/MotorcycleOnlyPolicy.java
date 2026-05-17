package com.parkflow.modules.configuration.domain.policy.impl;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.configuration.domain.policy.BaseOperationalProfilePolicy;
import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import org.springframework.stereotype.Component;

/**
 * Política operacional para parqueaderos de solo motocicletas.
 */
@Component
public class MotorcycleOnlyPolicy extends BaseOperationalProfilePolicy {

    @Override
    public OperationalProfile getProfile() {
        return OperationalProfile.MOTORCYCLE_ONLY;
    }

    @Override
    public boolean hasCapability(OperationalCapability capability) {
        // Todas las capacidades opcionales están desactivadas en este perfil.
        return false;
    }

    @Override
    public String resolveVehicleType(String requestedType) {
        return "MOTORCYCLE";
    }

    @Override
    public void validateEntry(String vehicleType, String entryMode, String lane, String terminal, String cashier) {
        if (!"MOTORCYCLE".equalsIgnoreCase(vehicleType) && !"MOTO".equalsIgnoreCase(vehicleType)) {
            throw new BusinessValidationException("El parqueadero está configurado en modo SOLO_MOTO. No se admiten otros tipos de vehículo.");
        }
        if (entryMode != null && !"VISITOR".equalsIgnoreCase(entryMode)) {
            throw new BusinessValidationException("El parqueadero está configurado en modo SOLO_MOTO. Solo se admite el tipo de cliente Visitante.");
        }
    }

    @Override
    protected String getDefaultVehicleType() {
        return "MOTORCYCLE";
    }

    @Override
    protected String getDefaultVisitorType() {
        return "VISITOR";
    }
}
