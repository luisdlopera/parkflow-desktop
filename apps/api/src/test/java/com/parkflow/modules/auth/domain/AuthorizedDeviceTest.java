package com.parkflow.modules.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class AuthorizedDeviceTest {

  @Test
  void default_authorized_true_and_can_revoke() {
    AuthorizedDevice d = new AuthorizedDevice();
    d.setDeviceId("dev-1");
    d.setDisplayName("Device 1");
    d.setPlatform("desktop");
    d.setFingerprint("fp-1");
    assertThat(d.isAuthorized()).isTrue();
    d.setAuthorized(false);
    d.setRevokedAt(OffsetDateTime.now());
    assertThat(d.isAuthorized()).isFalse();
    assertThat(d.getRevokedAt()).isNotNull();
  }
}
