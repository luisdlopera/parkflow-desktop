package com.parkflow.modules.parking.operation.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PlateValidatorTest {

    private PlateValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PlateValidator();
    }

    @Test
    void testNormalizePlate() {
        assertThat(validator.normalizePlate("abc-123")).isEqualTo("ABC123");
        assertThat(validator.normalizePlate(" abc 12 d ")).isEqualTo("ABC12D");
        assertThat(validator.normalizePlate("AB#C-123!")).isEqualTo("ABC123");
        assertThat(validator.normalizePlate("")).isEqualTo("");
        assertThat(validator.normalizePlate(null)).isEqualTo("");
    }

    @Test
    void testValidPlatesColombia() {
        assertThat(validator.validatePlate("CO", "CAR", "ABC123").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "CAR", "abc-123").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABC12D").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "abc 12 d").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "TRUCK", "XYZ987").isValid()).isTrue();
    }

    @Test
    void testInvalidPlatesColombia() {
        // CAR typed as MOTORCYCLE
        PlateValidationResult result1 = validator.validatePlate("CO", "CAR", "ABC12D");
        assertThat(result1.isValid()).isFalse();
        assertThat(result1.errorMessage()).contains("Parece que ingresaste una placa de moto");

        // MOTORCYCLE typed as CAR
        PlateValidationResult result2 = validator.validatePlate("CO", "MOTORCYCLE", "ABC123");
        assertThat(result2.isValid()).isFalse();
        assertThat(result2.errorMessage()).contains("Parece que ingresaste una placa de carro");

        // Bad formats
        assertThat(validator.validatePlate("CO", "CAR", "AB1234").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "AB123D").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "CAR", "").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "CAR", "!@#").isValid()).isFalse();
    }

    @Test
    void testUnsupportedCountryIsRejected() {
        PlateValidationResult result = validator.validatePlate("US", "CAR", "ABC123");

        assertThat(result.isValid()).isFalse();
        assertThat(result.errorMessage()).contains("Pais no soportado");
    }
}
