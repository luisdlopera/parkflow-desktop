package com.parkflow.modules.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class AuthSessionTest {

  @Test
  void default_fields_are_initialized_and_can_be_toggled() {
    AuthSession s = new AuthSession();
    s.setRefreshExpiresAt(OffsetDateTime.now().plusDays(7));
    s.setAccessExpiresAt(OffsetDateTime.now().plusMinutes(15));
    assertThat(s.isActive()).isTrue();
    s.setActive(false);
    assertThat(s.isActive()).isFalse();
  }
}
