package com.parkflow.modules.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PasswordResetTokenTest {

  @Test
  void isExpired_returns_true_when_past_expiresAt() {
    PasswordResetToken t = new PasswordResetToken();
    t.setExpiresAt(OffsetDateTime.now().minusHours(1));
    assertThat(t.isExpired()).isTrue();
  }

  @Test
  void isExpired_returns_false_when_before_expiresAt() {
    PasswordResetToken t = new PasswordResetToken();
    t.setExpiresAt(OffsetDateTime.now().plusHours(1));
    assertThat(t.isExpired()).isFalse();
  }

  @Test
  void default_used_is_false_and_setters_work() {
    PasswordResetToken t = new PasswordResetToken();
    UUID userId = UUID.randomUUID();
    t.setUserId(userId);
    t.setTokenHash("abc123");
    t.setExpiresAt(OffsetDateTime.now().plusHours(1));
    assertThat(t.isUsed()).isFalse();
    t.setUsed(true);
    assertThat(t.isUsed()).isTrue();
  }
}
