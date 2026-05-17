package com.parkflow.modules.configuration.domain.policy.impl;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.configuration.domain.policy.BaseOperationalProfilePolicy;
import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import org.springframework.stereotype.Component;

/**
 * Política operacional para parqueaderos de solo carros.
 */
@Component
public class CarOnlyPolicy extends BaseOperationalProfilePolicy {

    @Override
    public OperationalProfile getProfile() {
        return OperationalProfile.CAR_ONLY;
    }

    @Override
    public boolean hasCapability(OperationalCapability capability) {
        return false;
    }

    @Override
    public String resolveVehicleType(String requestedType) {
        return "CAR";
    }

    @Override
    public void validateEntry(String vehicleType, String entryMode, String lane, String terminal, String cashier) {
        if (!"CAR".equalsIgnoreCase(vehicleType) && !"CARRO".equalsIgnoreCase(vehicleType)) {
            throw new BusinessValidationException("El parqueadero está configurado en modo SOLO_CARRO. No se admiten otros tipos de vehículo.");
        }
    }

    @Override
    protected String getDefaultVehicleType() {
        return "CAR";
    }

    @Override
    protected String getDefaultVisitorType() {
        return "VISITOR";
    }
}
