package com.parkflow.modules.parking.operation.validation;

public record PlateValidationResult(
    boolean isValid,
    String normalizedPlate,
    String errorMessage
) {
    public static PlateValidationResult valid(String normalizedPlate) {
        return new PlateValidationResult(true, normalizedPlate, null);
    }

    public static PlateValidationResult invalid(String normalizedPlate, String errorMessage) {
        return new PlateValidationResult(false, normalizedPlate, errorMessage);
    }
}
