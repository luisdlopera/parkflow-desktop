package com.parkflow.modules.auth.security;

import com.parkflow.modules.auth.dto.OfflineLeaseResponse;
import io.jsonwebtoken.io.Decoders;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class OfflineLeaseSigner {

  private static final Logger log = LoggerFactory.getLogger(OfflineLeaseSigner.class);
  private static final String HMAC_ALGORITHM = "HmacSHA256";

  private final SecretKey key;

  public OfflineLeaseSigner(
      @Value("${app.security.jwt-secret}") String jwtSecret,
      Environment environment) {
    byte[] raw = deriveKey(jwtSecret, environment);
    this.key = new SecretKeySpec(raw, HMAC_ALGORITHM);
  }

  public String sign(OfflineLeaseResponse lease) {
    String data = canonicalString(lease);
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(key);
      byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
      return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(hmac);
    } catch (Exception e) {
      log.error("Failed to sign offline lease", e);
      return null;
    }
  }

  public boolean verify(OfflineLeaseResponse lease, String signature) {
    if (signature == null) return false;
    String expected = sign(lease);
    if (expected == null) return false;
    return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
  }

  private static String canonicalString(OfflineLeaseResponse lease) {
    return lease.sessionId() + "|"
        + lease.userId() + "|"
        + lease.deviceId() + "|"
        + lease.issuedAt().toEpochSecond() + "|"
        + lease.expiresAt().toEpochSecond() + "|"
        + String.join(",", lease.restrictedActions());
  }

  private static byte[] deriveKey(String jwtSecret, Environment environment) {
    byte[] bytes = null;
    try {
      bytes = Decoders.BASE64URL.decode(jwtSecret);
    } catch (Exception e) {
      try {
        bytes = Decoders.BASE64.decode(jwtSecret);
      } catch (Exception ex) {
      }
    }
    boolean isNonProd = false;
    try {
      String[] profiles = environment.getActiveProfiles();
      if (profiles == null || profiles.length == 0) {
        isNonProd = true;
      } else {
        for (String p : profiles) {
          String pp = p == null ? "" : p.toLowerCase();
          if (pp.equals("dev") || pp.equals("local") || pp.equals("test") || pp.equals("ci")) {
            isNonProd = true;
            break;
          }
        }
      }
    } catch (Exception ignored) {
      isNonProd = true;
    }
    if (bytes == null || bytes.length < 32 || jwtSecret == null || jwtSecret.startsWith("REPLACE_")) {
      if (isNonProd) {
        try {
          MessageDigest md = MessageDigest.getInstance("SHA-256");
          String secretToHash = jwtSecret != null ? jwtSecret : "default_dev_secret_replace_me";
          return md.digest(secretToHash.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
          throw new IllegalStateException("Unable to derive HMAC key for development profile", ex);
        }
      } else {
        throw new IllegalStateException(
            "SECURITY: app.security.jwt-secret must be a 256-bit (or larger) key for offline lease signing. "
                + "Generate one with: openssl rand -base64 32 | tr -d '\n'");
      }
    }
    return bytes;
  }
}
