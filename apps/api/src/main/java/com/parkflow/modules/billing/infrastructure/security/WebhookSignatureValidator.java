package com.parkflow.modules.billing.infrastructure.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Validates webhook signatures from invoice providers.
 * Supports HMAC-SHA256 (standard for Alegra, Siigo, etc.)
 */
@Slf4j
@Component
public class WebhookSignatureValidator {

  public boolean validate(String payload, String signature, String secret) {
    if (secret == null || secret.isBlank()) {
      log.warn("[Webhook] Signature validation skipped: no secret configured");
      return true; // Allow if no secret is configured
    }

    if (signature == null || signature.isBlank()) {
      log.warn("[Webhook] Validation failed: missing signature header");
      return false;
    }

    try {
      String computed = computeSignature(payload, secret);
      boolean valid = constantTimeEquals(computed, signature);

      if (!valid) {
        log.warn("[Webhook] Signature validation failed: expected {} but got {}",
            computed.substring(0, Math.min(10, computed.length())) + "...",
            signature.substring(0, Math.min(10, signature.length())) + "...");
      }

      return valid;
    } catch (Exception e) {
      log.error("[Webhook] Signature validation error: {}", e.getMessage());
      return false;
    }
  }

  private String computeSignature(String payload, String secret) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    mac.init(key);
    byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(hash);
  }

  private boolean constantTimeEquals(String a, String b) {
    if (a == null || b == null) {
      return a == b;
    }

    byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
    byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);

    if (aBytes.length != bBytes.length) {
      return false;
    }

    int result = 0;
    for (int i = 0; i < aBytes.length; i++) {
      result |= aBytes[i] ^ bBytes[i];
    }

    return result == 0;
  }
}
