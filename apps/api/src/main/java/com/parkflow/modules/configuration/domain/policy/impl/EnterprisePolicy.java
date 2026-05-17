package com.parkflow.modules.configuration.domain.policy.impl;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.configuration.domain.policy.BaseOperationalProfilePolicy;
import org.springframework.stereotype.Component;

/**
 * Política operacional para parqueaderos corporativos/empresariales.
 */
@Component
public class EnterprisePolicy extends BaseOperationalProfilePolicy {

    @Override
    public OperationalProfile getProfile() {
        return OperationalProfile.ENTERPRISE;
    }

    @Override
    public boolean hasCapability(OperationalCapability capability) {
        // Enfoque corporativo/empresarial. Deshabilita override de tarifa manual.
        return capability != OperationalCapability.MANUAL_RATE_OVERRIDE;
    }

    @Override
    protected String getDefaultVehicleType() {
        return "CAR";
    }

    @Override
    protected String getDefaultVisitorType() {
        return "EMPLOYEE";
    }
}
