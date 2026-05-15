package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.settings.dto.ParametersValidateResponse;
import com.parkflow.modules.settings.dto.ParkingParametersData;

public interface ParkingParametersUseCase {
    ParkingParametersData get(String siteCode);
    ParkingParametersData put(String siteCode, ParkingParametersData incoming);
    ParametersValidateResponse validate(ParkingParametersData data);
    ParkingParametersData reset(String siteCode);
}
