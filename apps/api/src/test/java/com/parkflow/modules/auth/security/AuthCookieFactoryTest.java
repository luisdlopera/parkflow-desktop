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
}
