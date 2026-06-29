package com.parkflow.modules.communication.infrastructure.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EncryptionServiceTest {

    private EncryptionService encryptionService;
    private final String testKey = "1234567890123456"; // 16 byte key

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptionService(testKey);
        encryptionService.init();
    }

    @Test
    void shouldEncryptAndDecryptSuccessfully() {
        String originalText = "my-secret-password";
        String encrypted = encryptionService.encrypt(originalText);
        
        assertNotNull(encrypted);
        assertNotEquals(originalText, encrypted);

        String decrypted = encryptionService.decrypt(encrypted);
        assertEquals(originalText, decrypted);
    }

    @Test
    void shouldReturnNullWhenEncryptingNullOrEmpty() {
        assertNull(encryptionService.encrypt(null));
        assertNull(encryptionService.encrypt(""));
    }

    @Test
    void shouldReturnNullWhenDecryptingNullOrEmpty() {
        assertNull(encryptionService.decrypt(null));
        assertNull(encryptionService.decrypt(""));
    }

}
