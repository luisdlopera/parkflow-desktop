package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

@ExtendWith(MockitoExtension.class)
class AuthCookieFactoryTest {

    @Mock
    private Environment environment;

    @Mock
    private HttpServletResponse response;

    @Mock
    private HttpServletRequest request;

    private AuthCookieFactory factory;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        factory = new AuthCookieFactory(environment);
        ReflectionTestUtils.setField(factory, "accessTokenTtlMinutes", 15);
        ReflectionTestUtils.setField(factory, "refreshTokenTtlDays", 7);
        ReflectionTestUtils.setField(factory, "cookieSecure", true);
        ReflectionTestUtils.setField(factory, "cookieSameSite", "Strict");
    }

    @Test
    void testSetAuthCookies_AddsCorrectHeaders() {
        // Act
        factory.setAuthCookies(response, "access_val", "refresh_val");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        List<String> values = headerValueCaptor.getAllValues();
        assertThat(values.get(0)).contains("parkflow_access=access_val");
        assertThat(values.get(0)).contains("Max-Age=900"); // 15 mins
        assertThat(values.get(0)).contains("HttpOnly");
        assertThat(values.get(0)).contains("Secure");
        assertThat(values.get(0)).contains("SameSite=Strict");

        assertThat(values.get(1)).contains("parkflow_refresh=refresh_val");
        assertThat(values.get(1)).contains("Max-Age=604800"); // 7 days
    }

    @Test
    void testClearAuthCookies_SetsMaxAgeZero() {
        // Act
        factory.clearAuthCookies(response);

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        List<String> values = headerValueCaptor.getAllValues();
        assertThat(values.get(0)).contains("parkflow_access=");
        assertThat(values.get(0)).contains("Max-Age=0");

        assertThat(values.get(1)).contains("parkflow_refresh=");
        assertThat(values.get(1)).contains("Max-Age=0");
    }

    @Test
    void testExtractRefreshToken_ReturnsTokenWhenPresent() {
        // Arrange
        Cookie[] cookies = {new Cookie("parkflow_refresh", "valid_refresh")};
        when(request.getCookies()).thenReturn(cookies);

        // Act
        String token = factory.extractRefreshToken(request);

        // Assert
        assertThat(token).isEqualTo("valid_refresh");
    }

    @Test
    void testExtractRefreshToken_ReturnsNullWhenNotPresent() {
        // Arrange
        Cookie[] cookies = {new Cookie("other_cookie", "val")};
        when(request.getCookies()).thenReturn(cookies);

        // Act
        String token = factory.extractRefreshToken(request);

        // Assert
        assertThat(token).isNull();
    }

    @Test
    void testSecureAttribute_ProdProfile_AlwaysSecure() {
        // Arrange - prod profile is default in setUp()
        ReflectionTestUtils.setField(factory, "cookieSecure", false); // Configured to false

        // Act
        factory.setAuthCookies(response, "access_val", "refresh_val");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());
        
        // Should STILL have Secure despite config saying false, because it's prod
        assertThat(headerValueCaptor.getAllValues().get(0)).contains("Secure");
    }

    @Test
    void testSecureAttribute_DevProfile_RespectsConfig() {
        // Arrange
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        ReflectionTestUtils.setField(factory, "cookieSecure", false); // Configured to false

        // Act
        factory.setAuthCookies(response, "access_val", "refresh_val");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        // Should NOT have Secure because it's dev and config is false
        assertThat(headerValueCaptor.getAllValues().get(0)).doesNotContain("Secure");
    }

    // ============================================================================
    // FASE 1: VALIDACIONES ADICIONALES DE ATRIBUTOS
    // ============================================================================

    @Test
    void testCookieAttributes_AllPresent() {
        // Act
        factory.setAuthCookies(response, "access_val", "refresh_val");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        String accessCookieHeader = headerValueCaptor.getAllValues().get(0);

        // Verify all required attributes present
        assertThat(accessCookieHeader).contains("parkflow_access=access_val");
        assertThat(accessCookieHeader).contains("Path=/");
        assertThat(accessCookieHeader).contains("HttpOnly");
        assertThat(accessCookieHeader).contains("Secure");
        assertThat(accessCookieHeader).contains("SameSite=Strict");
        assertThat(accessCookieHeader).contains("Max-Age=900");
    }

    @Test
    void testCookieTTL_AccessTokenCorrect() {
        // Arrange
        ReflectionTestUtils.setField(factory, "accessTokenTtlMinutes", 15);

        // Act
        factory.setAuthCookies(response, "access_val", "refresh_val");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        List<String> values = headerValueCaptor.getAllValues();
        assertThat(values.get(0))
            .contains("Max-Age=900"); // 15 * 60 = 900
    }

    @Test
    void testCookieTTL_RefreshTokenCorrect() {
        // Arrange
        ReflectionTestUtils.setField(factory, "refreshTokenTtlDays", 7);

        // Act
        factory.setAuthCookies(response, "access_val", "refresh_val");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        String refreshCookieHeader = headerValueCaptor.getAllValues().get(1);
        assertThat(refreshCookieHeader)
            .contains("Max-Age=604800"); // 7 * 24 * 60 * 60 = 604800
    }

    @Test
    void testCookieValues_NotEmpty() {
        // Act
        factory.setAuthCookies(response, "access_val", "refresh_val");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        List<String> cookieHeaders = headerValueCaptor.getAllValues();

        // Extract token values
        String accessToken = extractTokenValue(cookieHeaders.get(0), "parkflow_access");
        String refreshToken = extractTokenValue(cookieHeaders.get(1), "parkflow_refresh");

        assertThat(accessToken).isNotEmpty().isEqualTo("access_val");
        assertThat(refreshToken).isNotEmpty().isEqualTo("refresh_val");
    }

    @Test
    void testCookieValues_AreDistinct() {
        // Act
        factory.setAuthCookies(response, "access_token_123", "refresh_token_456");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        List<String> cookieHeaders = headerValueCaptor.getAllValues();

        String accessToken = extractTokenValue(cookieHeaders.get(0), "parkflow_access");
        String refreshToken = extractTokenValue(cookieHeaders.get(1), "parkflow_refresh");

        assertThat(accessToken).isNotEqualTo(refreshToken);
        assertThat(accessToken).isEqualTo("access_token_123");
        assertThat(refreshToken).isEqualTo("refresh_token_456");
    }

    @Test
    void testClearAuthCookies_BothCookiesCleared() {
        // Act
        factory.clearAuthCookies(response);

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        List<String> values = headerValueCaptor.getAllValues();

        // Both cookies should have Max-Age=0
        assertThat(values.get(0)).contains("parkflow_access=");
        assertThat(values.get(0)).contains("Max-Age=0");

        assertThat(values.get(1)).contains("parkflow_refresh=");
        assertThat(values.get(1)).contains("Max-Age=0");
    }

    @Test
    void testCookiePath_AlwaysSlash() {
        // Act
        factory.setAuthCookies(response, "token", "refresh");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        String accessCookie = headerValueCaptor.getAllValues().get(0);
        assertThat(accessCookie).contains("Path=/");
    }

    @Test
    void testSameSiteAttribute_AlwaysStrict() {
        // Act
        factory.setAuthCookies(response, "token", "refresh");

        // Assert
        ArgumentCaptor<String> headerValueCaptor = ArgumentCaptor.forClass(String.class);
        verify(response, org.mockito.Mockito.times(2)).addHeader(eq("Set-Cookie"), headerValueCaptor.capture());

        String accessCookie = headerValueCaptor.getAllValues().get(0);
        assertThat(accessCookie)
            .contains("SameSite=Strict")
            .doesNotContain("SameSite=Lax")
            .doesNotContain("SameSite=None");
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    private String extractTokenValue(String cookieHeader, String cookieName) {
        String[] parts = cookieHeader.split(";");
        for (String part : parts) {
            part = part.trim();
            if (part.startsWith(cookieName + "=")) {
                return part.substring((cookieName + "=").length());
            }
        }
        return "";
    }
}
