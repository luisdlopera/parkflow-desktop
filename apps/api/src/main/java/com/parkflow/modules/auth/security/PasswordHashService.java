package com.parkflow.modules.auth.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class PasswordHashService {
  private final PasswordEncoder passwordEncoder;

  public PasswordHashService(PasswordEncoder passwordEncoder) {
    this.passwordEncoder = passwordEncoder;
  }

  public boolean matchesPassword(String raw, String hash) {
    return passwordEncoder.matches(raw, hash);
  }

  public String encodePassword(String raw) {
    return passwordEncoder.encode(raw);
  }

  public String sha256(String text) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to hash value", ex);
    }
  }
}
