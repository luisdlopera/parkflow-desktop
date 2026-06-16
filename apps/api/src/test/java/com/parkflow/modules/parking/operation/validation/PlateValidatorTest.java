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

    // === Motorcycle-specific edge cases ===

    @Test
    void testMotorcyclePlate_ValidEdgeCases() {
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABC12D").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "XYZ99Z").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "MNO11A").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "QWE00B").isValid()).isTrue();
    }

    @Test
    void testMotorcyclePlate_InvalidEdgeCases() {
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABC12DD").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABC123D").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "AB1C2D").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "12345A").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABCD12").isValid()).isFalse();
    }

    @Test
    void testMotorcyclePlate_CrossValidationWithCar() {
        PlateValidationResult motoPlateAsCar = validator.validatePlate("CO", "CAR", "ABC12D");
        assertThat(motoPlateAsCar.isValid()).isFalse();
        assertThat(motoPlateAsCar.errorMessage()).contains("moto");

        PlateValidationResult carPlateAsMoto = validator.validatePlate("CO", "MOTORCYCLE", "ABC123");
        assertThat(carPlateAsMoto.isValid()).isFalse();
        assertThat(carPlateAsMoto.errorMessage()).contains("carro");
    }

    @Test
    void testMotorcyclePlate_SpecialCharactersAndSpaces() {
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABC 12 D").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "abc-12-d").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "abc_12_d").isValid()).isTrue();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ab c12 d").isValid()).isTrue();
    }

    @Test
    void testMotorcyclePlate_NullAndEmpty() {
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", null).isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "   ").isValid()).isFalse();
    }

    @Test
    void testMotorcyclePlate_TooShort() {
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "A1").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "AB1").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABC1").isValid()).isFalse();
        assertThat(validator.validatePlate("CO", "MOTORCYCLE", "ABC12").isValid()).isFalse();
    }

    @Test
    void testNormalizePlate_WithMotorcycleFormats() {
        assertThat(validator.normalizePlate("ABC-12D")).isEqualTo("ABC12D");
        assertThat(validator.normalizePlate("abc 12 d")).isEqualTo("ABC12D");
        assertThat(validator.normalizePlate("ABC12D")).isEqualTo("ABC12D");
        assertThat(validator.normalizePlate("abc12d")).isEqualTo("ABC12D");
    }

    @Test
    void testMotorcyclePlate_CrossValidationWithOtherTypes() {
        PlateValidationResult motoPlateAsVan = validator.validatePlate("CO", "VAN", "ABC12D");
        assertThat(motoPlateAsVan.isValid()).isFalse();
        assertThat(motoPlateAsVan.errorMessage()).contains("moto");

        PlateValidationResult motoPlateAsTruck = validator.validatePlate("CO", "TRUCK", "ABC12D");
        assertThat(motoPlateAsTruck.isValid()).isFalse();
        assertThat(motoPlateAsTruck.errorMessage()).contains("moto");
    }

    @Test
    void testMotorcyclePlate_TypeOtherWithMotoPlate() {
        PlateValidationResult result = validator.validatePlate("CO", "OTHER", "ABC12D");
        assertThat(result.isValid()).isFalse();
    }
}
