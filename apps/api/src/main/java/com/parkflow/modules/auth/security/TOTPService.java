package com.parkflow.modules.auth.security;

import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * TOTP (Time-based One-Time Password) Service
 *
 * <p>DEFERRED: Requires totp library. Currently disabled to allow compilation.
 * When 2FA is needed, add the dependency and implement the full service.
 */
@Service
@Slf4j
public class TOTPService {

  public String generateSecret() {
    throw new UnsupportedOperationException("TOTP service not yet implemented");
  }

  public String generateQrCodeUrl(String email, String secret, String issuer) {
    throw new UnsupportedOperationException("TOTP service not yet implemented");
  }

  public boolean verifyCode(String secret, String code) {
    throw new UnsupportedOperationException("TOTP service not yet implemented");
  }

  public String getCurrentCode(String secret) {
    throw new UnsupportedOperationException("TOTP service not yet implemented");
  }

  public List<String> generateBackupCodes() {
    return new ArrayList<>();
  }
}
