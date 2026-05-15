package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.HeartbeatRequest;
import com.parkflow.modules.licensing.dto.HeartbeatResponse;

public interface HeartbeatUseCase {
    HeartbeatResponse processHeartbeat(HeartbeatRequest request, String clientIp);
}
