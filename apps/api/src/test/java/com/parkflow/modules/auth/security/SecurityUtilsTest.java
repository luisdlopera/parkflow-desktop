package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class SecurityUtilsTest {

  @AfterEach
  void cleanup() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void requireUserId_and_companyId_return_values_when_present() {
    UUID userId = UUID.randomUUID();
    UUID companyId = UUID.randomUUID();
    AuthPrincipal principal = new AuthPrincipal(userId, companyId, "a@b.com", "ADMIN", List.of(new SimpleGrantedAuthority("TICKETS_EMITIR")));
    SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(principal, null));

    assertThat(SecurityUtils.requireUserId()).isEqualTo(userId);
    assertThat(SecurityUtils.requireCompanyId()).isEqualTo(companyId);
    assertThat(SecurityUtils.requireUserRole().name()).isEqualTo("ADMIN");
  }

  @Test
  void requireUserId_throws_when_no_auth() {
    SecurityContextHolder.clearContext();
    assertThatThrownBy(SecurityUtils::requireUserId).isInstanceOf(RuntimeException.class);
  }

  @Test
  void requireCompanyId_throws_when_no_auth() {
    SecurityContextHolder.clearContext();
    assertThatThrownBy(SecurityUtils::requireCompanyId).isInstanceOf(RuntimeException.class);
  }
}
