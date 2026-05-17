package com.parkflow.modules.configuration.domain.policy.impl;

import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.configuration.domain.policy.BaseOperationalProfilePolicy;
import org.springframework.stereotype.Component;

/**
 * Política operacional para servicios de Valet Parking.
 */
@Component
public class ValetPolicy extends BaseOperationalProfilePolicy {

    @Override
    public OperationalProfile getProfile() {
        return OperationalProfile.VALET;
    }

    @Override
    public boolean hasCapability(OperationalCapability capability) {
        return switch (capability) {
            case VEHICLE_TYPE_SELECTION, ADVANCED_SECTION, CASHIER_SELECTION, VEHICLE_CONDITION_CHECK, OBSERVATIONS -> true;
            default -> false;
        };
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
