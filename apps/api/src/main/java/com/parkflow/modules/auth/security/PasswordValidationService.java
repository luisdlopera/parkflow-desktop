package com.parkflow.modules.auth.security;

import com.parkflow.modules.common.exception.OperationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class PasswordValidationService {

    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
        "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!.])(?=\\S+$).{8,}$");

    private static final Set<String> COMMON_PASSWORDS;

    static {
        try (InputStream is = PasswordValidationService.class
                .getResourceAsStream("/security/common-passwords.txt")) {
            if (is != null) {
                COMMON_PASSWORDS = new BufferedReader(new InputStreamReader(is))
                    .lines()
                    .map(String::toLowerCase)
                    .collect(Collectors.toUnmodifiableSet());
                log.info("Loaded {} common passwords for validation", COMMON_PASSWORDS.size());
            } else {
                log.warn("Common passwords list not found");
                COMMON_PASSWORDS = Set.of();
            }
        } catch (IOException e) {
            log.error("Failed to load common passwords list", e);
            throw new RuntimeException("Failed to initialize password validation", e);
        }
    }

    public void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new OperationException(HttpStatus.BAD_REQUEST,
                "La contraseña debe tener al menos 8 caracteres");
        }

        if (!PASSWORD_PATTERN.matcher(password).matches()) {
            throw new OperationException(HttpStatus.BAD_REQUEST,
                "La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial");
        }
    }

    public void validatePasswordNotCommon(String password) {
        if (password != null && COMMON_PASSWORDS.contains(password.toLowerCase())) {
            throw new OperationException(HttpStatus.BAD_REQUEST,
                "La contraseña elegida es muy común. Por favor intenta con una contraseña más única");
        }
    }
}
