package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class TenantContextTest {

  @Test
  void set_get_and_clear_work_as_expected() {
    UUID id = UUID.randomUUID();
    TenantContext.setTenantId(id);
    assertThat(TenantContext.getTenantId()).isEqualTo(id);
    TenantContext.clear();
    assertThat(TenantContext.getTenantId()).isNull();
  }
}
