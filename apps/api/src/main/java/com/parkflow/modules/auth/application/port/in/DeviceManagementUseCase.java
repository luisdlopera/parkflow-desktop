package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.DeviceDecisionRequest;
import com.parkflow.modules.auth.dto.DeviceInfoResponse;
import java.util.List;

public interface DeviceManagementUseCase {
    List<DeviceInfoResponse> listDevices();
    DeviceInfoResponse revokeDevice(DeviceDecisionRequest request);
    DeviceInfoResponse authorizeDevice(DeviceDecisionRequest request);
}
