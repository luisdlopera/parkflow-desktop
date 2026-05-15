package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.GenerateLicenseRequest;
import com.parkflow.modules.licensing.dto.GenerateLicenseResponse;

public interface GenerateLicenseUseCase {
    GenerateLicenseResponse generateOfflineLicense(GenerateLicenseRequest request, String performedBy);
}
