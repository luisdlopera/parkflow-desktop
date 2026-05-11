package com.parkflow.modules.auth.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordHashServiceTest {
  private final PasswordHashService service = new PasswordHashService(new BCryptPasswordEncoder());

  @Test
  void encodePassword_ShouldCreateVerifiableNonPlaintextHash() {
    String hash = service.encodePassword("Qwert.12345");

    assertThat(hash).isNotEqualTo("Qwert.12345");
    assertThat(service.matchesPassword("Qwert.12345", hash)).isTrue();
    assertThat(service.matchesPassword("wrong", hash)).isFalse();
  }

  @Test
  void sha256_ShouldBeStableForRefreshTokenHashing() {
    assertThat(service.sha256("refresh-token"))
        .isEqualTo("0eb17643d4e9261163783a420859c92c7d212fa9624106a12b510afbec266120");
  }
}
