package com.parkflow.modules.communication.infrastructure.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;

import com.parkflow.modules.communication.application.port.out.EncryptionPort;
import com.parkflow.modules.communication.application.port.out.CommunicationConnectionPort;

@Slf4j
@Service("communicationEncryptionService")
@RequiredArgsConstructor
public class EncryptionService implements EncryptionPort, CommunicationConnectionPort {

    private final String keyString;
    private SecretKeySpec secretKey;

    public EncryptionService(@Value("${communication.encryption.key:}") String keyString) {
        this.keyString = keyString;
    }

    @PostConstruct
    public void init() {
        try {
            String keyToUse = keyString != null && !keyString.isBlank() ? keyString : "dev-fallback-key-parkflow";
            if (keyToUse.equals("dev-fallback-key-parkflow")) {
                log.warn("[Communication] No encryption key configured. Using dev key. This is INSECURE in production.");
            }
            byte[] key = keyToUse.getBytes(StandardCharsets.UTF_8);
            MessageDigest sha = MessageDigest.getInstance("SHA-1");
            key = sha.digest(key);
            key = Arrays.copyOf(key, 16);
            secretKey = new SecretKeySpec(key, "AES");
        } catch (Exception e) {
            throw new RuntimeException("Error initializing encryption service", e);
        }
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return null;
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isBlank()) {
            return null;
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            byte[] encrypted = Base64.getDecoder().decode(ciphertext);
            byte[] decrypted = cipher.doFinal(encrypted);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
