package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import com.parkflow.modules.common.exception.OperationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PasswordValidationServiceTest {

    private PasswordValidationService passwordValidationService;

    @BeforeEach
    void setUp() {
        passwordValidationService = new PasswordValidationService();
    }

    @Test
    void testValidatePasswordStrength_ValidPassword_Passes() {
        assertDoesNotThrow(() ->
            passwordValidationService.validatePasswordStrength("ValidPass123!")
        );
    }

    @Test
    void testValidatePasswordStrength_TooShort_Throws() {
        assertThatThrownBy(() ->
            passwordValidationService.validatePasswordStrength("Short1!")
        ).isInstanceOf(OperationException.class)
            .hasMessageContaining("al menos 8 caracteres");
    }

    @Test
    void testValidatePasswordStrength_MissingUppercase_Throws() {
        assertThatThrownBy(() ->
            passwordValidationService.validatePasswordStrength("lowercase123!")
        ).isInstanceOf(OperationException.class)
            .hasMessageContaining("mayúscula");
    }

    @Test
    void testValidatePasswordStrength_MissingNumber_Throws() {
        assertThatThrownBy(() ->
            passwordValidationService.validatePasswordStrength("NoNumbers!")
        ).isInstanceOf(OperationException.class)
            .hasMessageContaining("número");
    }

    @Test
    void testValidatePasswordStrength_MissingSpecialChar_Throws() {
        assertThatThrownBy(() ->
            passwordValidationService.validatePasswordStrength("NoSpecial123")
        ).isInstanceOf(OperationException.class)
            .hasMessageContaining("carácter especial");
    }

    @Test
    void testValidatePasswordNotCommon_CommonPassword_Throws() {
        assertThatThrownBy(() ->
            passwordValidationService.validatePasswordNotCommon("password")
        ).isInstanceOf(OperationException.class)
            .hasMessageContaining("muy común");
    }

    @Test
    void testValidatePasswordNotCommon_AnotherCommon_Throws() {
        assertThatThrownBy(() ->
            passwordValidationService.validatePasswordNotCommon("123456")
        ).isInstanceOf(OperationException.class)
            .hasMessageContaining("muy común");
    }

    @Test
    void testValidatePasswordNotCommon_CommonPasswordCaseInsensitive_Throws() {
        assertThatThrownBy(() ->
            passwordValidationService.validatePasswordNotCommon("PASSWORD")
        ).isInstanceOf(OperationException.class)
            .hasMessageContaining("muy común");
    }

    @Test
    void testValidatePasswordNotCommon_UniquePassword_Passes() {
        assertDoesNotThrow(() ->
            passwordValidationService.validatePasswordNotCommon("Ux#Qm9$kL2@pR5")
        );
    }

    @Test
    void testValidatePasswordNotCommon_NullPassword_Passes() {
        assertDoesNotThrow(() ->
            passwordValidationService.validatePasswordNotCommon(null)
        );
    }
}
