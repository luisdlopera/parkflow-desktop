package com.parkflow.modules.configuration.domain.policy;

import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Base abstracta para facilitar la definición de perfiles operacionales mapeando automáticamente
 * las capacidades (capabilities) hacia la estructura de configuración utilizada por el frontend.
 */
public abstract class BaseOperationalProfilePolicy implements OperationalProfilePolicy {

    @Override
    public Map<String, Object> getDerivedConfiguration() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("showVehicleType", hasCapability(OperationalCapability.VEHICLE_TYPE_SELECTION));
        config.put("defaultVehicleType", getDefaultVehicleType());
        config.put("showVisitorType", hasCapability(OperationalCapability.VISITOR_TYPE_SELECTION));
        config.put("defaultVisitorType", getDefaultVisitorType());
        config.put("showAdvancedSection", hasCapability(OperationalCapability.ADVANCED_SECTION));
        config.put("enableManualRate", hasCapability(OperationalCapability.MANUAL_RATE_OVERRIDE));
        config.put("enableLaneSelection", hasCapability(OperationalCapability.LANE_SELECTION));
        config.put("enableTerminalSelection", hasCapability(OperationalCapability.TERMINAL_SELECTION));
        config.put("enableCashierSelection", hasCapability(OperationalCapability.CASHIER_SELECTION));
        config.put("enableVehicleCondition", hasCapability(OperationalCapability.VEHICLE_CONDITION_CHECK));
        config.put("enableObservations", hasCapability(OperationalCapability.OBSERVATIONS));
        config.put("enableCountryPlate", hasCapability(OperationalCapability.COUNTRY_PLATE_FORMATTING));
        return config;
    }

    protected abstract String getDefaultVehicleType();
    protected abstract String getDefaultVisitorType();
}
