package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.Claims;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.core.env.Environment;

class JwtTokenServiceTest {

  // 32 bytes key (base64) -> safe for HS256
  private static final String TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  private static final Environment ENV = Mockito.mock(Environment.class);

  private final JwtTokenService service = new JwtTokenService(TEST_KEY, 15, 7, 30, ENV);

  @Test
  void createAndParseAccessToken_containsExpectedClaims() {
    UUID userId = UUID.randomUUID();
    UUID companyId = UUID.randomUUID();
    UUID sessionId = UUID.randomUUID();

    String token = service.createAccessToken(userId, companyId, sessionId, "u@x.com", Map.of("role", "ADMIN"));

    Claims claims = service.parse(token);

    assertThat(claims.getSubject()).isEqualTo(userId.toString());
    assertThat(claims.get("cid", String.class)).isEqualTo(companyId.toString());
    assertThat(claims.get("sid", String.class)).isEqualTo(sessionId.toString());
    assertThat(claims.get("email", String.class)).isEqualTo("u@x.com");
    assertThat(claims.get("role", String.class)).isEqualTo("ADMIN");
  }

  @Test
  void createRefreshToken_and_parse_containsJtiAndTyp() {
    UUID userId = UUID.randomUUID();
    UUID sessionId = UUID.randomUUID();
    String jti = "jti-123";

    String token = service.createRefreshToken(userId, sessionId, jti);
    Claims claims = service.parse(token);

    assertThat(claims.getSubject()).isEqualTo(userId.toString());
    assertThat(claims.get("jti", String.class)).isEqualTo(jti);
    assertThat(claims.get("typ", String.class)).isEqualTo("refresh");
  }

  @Test
  void parse_invalidSignature_throws() {
    // create a token with different key
    JwtTokenService other = new JwtTokenService("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=", 15, 7, 30, ENV);
    String token = other.createAccessToken(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "x@x.com", Map.of());

    assertThatThrownBy(() -> service.parse(token)).isInstanceOf(Exception.class);
  }
}
