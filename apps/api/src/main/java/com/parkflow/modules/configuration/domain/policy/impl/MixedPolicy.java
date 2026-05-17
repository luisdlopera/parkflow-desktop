package com.parkflow.modules.configuration.domain.policy.impl;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.configuration.domain.policy.BaseOperationalProfilePolicy;
import org.springframework.stereotype.Component;

/**
 * Política operacional estándar mixta para parqueaderos que aceptan todo tipo de vehículos y visitantes.
 */
@Component
public class MixedPolicy extends BaseOperationalProfilePolicy {

    @Override
    public OperationalProfile getProfile() {
        return OperationalProfile.MIXED;
    }

    @Override
    public boolean hasCapability(OperationalCapability capability) {
        // Mixto tiene todas las capacidades operativas encendidas excepto override de tarifa manual.
        return capability != OperationalCapability.MANUAL_RATE_OVERRIDE;
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
