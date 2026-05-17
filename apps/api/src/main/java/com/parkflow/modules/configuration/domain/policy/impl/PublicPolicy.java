package com.parkflow.modules.configuration.domain.policy.impl;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.configuration.domain.policy.BaseOperationalProfilePolicy;
import org.springframework.stereotype.Component;

/**
 * Política operacional para parqueaderos públicos de alta rotación (habilita todas las capacidades).
 */
@Component
public class PublicPolicy extends BaseOperationalProfilePolicy {

    @Override
    public OperationalProfile getProfile() {
        return OperationalProfile.PUBLIC;
    }

    @Override
    public boolean hasCapability(OperationalCapability capability) {
        // El perfil público de alta rotación tiene absolutamente todas las capacidades operativas encendidas.
        return true;
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
