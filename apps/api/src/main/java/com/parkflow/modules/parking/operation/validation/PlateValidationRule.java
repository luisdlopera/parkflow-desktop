package com.parkflow.modules.parking.operation.validation;

import java.util.regex.Pattern;

public record PlateValidationRule(
    String countryCode,
    String vehicleType,
    Pattern pattern,
    String example,
    String errorMessage,
    boolean enabled
) {}
