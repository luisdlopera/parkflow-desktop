package com.parkflow.modules.configuration.domain.policy.impl;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.configuration.domain.policy.BaseOperationalProfilePolicy;
import org.springframework.stereotype.Component;

/**
 * Política operacional para parqueaderos residenciales enfocados en residentes y visitantes fijos.
 */
@Component
public class ResidentialPolicy extends BaseOperationalProfilePolicy {

    @Override
    public OperationalProfile getProfile() {
        return OperationalProfile.RESIDENTIAL;
    }

    @Override
    public boolean hasCapability(OperationalCapability capability) {
        return switch (capability) {
            case VEHICLE_TYPE_SELECTION, VISITOR_TYPE_SELECTION, LANE_SELECTION, OBSERVATIONS -> true;
            default -> false;
        };
    }

    @Override
    protected String getDefaultVehicleType() {
        return "CAR";
    }

    @Override
    protected String getDefaultVisitorType() {
        return "RESIDENT";
    }
}
