package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.LicenseValidationRequest;
import com.parkflow.modules.licensing.dto.LicenseValidationResponse;

public interface ValidateLicenseUseCase {
    LicenseValidationResponse validateLicense(LicenseValidationRequest request);
}
