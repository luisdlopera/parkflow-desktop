package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import io.jsonwebtoken.Claims;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private AuthSessionPort authSessionRepository;
    @Mock
    private AppUserPort appUserRepository;
    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;
    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthFilter jwtAuthFilter;

    private UUID userId;
    private UUID companyId;
    private UUID sessionId;
    private AuthSession mockSession;
    private AppUser mockUser;
    @Mock
    private Claims mockClaims;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        companyId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        mockUser = new AppUser();
        mockUser.setId(userId);
        mockUser.setCompanyId(companyId);
        mockUser.setActive(true);
        mockUser.setBlocked(false);

        mockSession = new AuthSession();
        mockSession.setId(sessionId);
        mockSession.setUser(mockUser);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
        org.slf4j.MDC.clear();
    }

    @Test
    void testDoFilterInternal_NoToken_ProceedsWithoutAuth() throws Exception {
        when(request.getCookies()).thenReturn(null);

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void testDoFilterInternal_InvalidToken_ProceedsWithoutAuth() throws Exception {
        Cookie[] cookies = {new Cookie("parkflow_access", "invalid_token")};
        when(request.getCookies()).thenReturn(cookies);
        when(jwtTokenService.parse("invalid_token")).thenThrow(new RuntimeException("invalid"));

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void testDoFilterInternal_ValidToken_SetsAuthentication() throws Exception {
        Cookie[] cookies = {new Cookie("parkflow_access", "valid_token")};
        when(request.getCookies()).thenReturn(cookies);
        
        when(jwtTokenService.parse("valid_token")).thenReturn(mockClaims);
        when(mockClaims.get("typ", String.class)).thenReturn("access");
        when(mockClaims.getSubject()).thenReturn(userId.toString());
        when(mockClaims.get("sid", String.class)).thenReturn(sessionId.toString());
        when(mockClaims.get("cid", String.class)).thenReturn(companyId.toString());
        when(mockClaims.get("email", String.class)).thenReturn("test@example.com");
        when(mockClaims.get("role", String.class)).thenReturn("ADMIN");
        when(mockClaims.get("permissions", List.class)).thenReturn(List.of("perm1", "perm2"));

        when(authSessionRepository.findByIdAndActiveTrue(sessionId)).thenReturn(Optional.of(mockSession));
        when(appUserRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();

    }

    @Test
    void testDoFilterInternal_SessionNotFound_WritesUnauthorized() throws Exception {
        Cookie[] cookies = {new Cookie("parkflow_access", "valid_token")};
        when(request.getCookies()).thenReturn(cookies);
        
        when(jwtTokenService.parse("valid_token")).thenReturn(mockClaims);
        when(mockClaims.get("typ", String.class)).thenReturn("access");
        when(mockClaims.getSubject()).thenReturn(userId.toString());
        when(mockClaims.get("sid", String.class)).thenReturn(sessionId.toString());

        when(authSessionRepository.findByIdAndActiveTrue(sessionId)).thenReturn(Optional.empty());

        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
        when(request.getRequestURI()).thenReturn("/api/test");

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    void testDoFilterInternal_UserBlocked_WritesUnauthorized() throws Exception {
        Cookie[] cookies = {new Cookie("parkflow_access", "valid_token")};
        when(request.getCookies()).thenReturn(cookies);
        
        when(jwtTokenService.parse("valid_token")).thenReturn(mockClaims);
        when(mockClaims.get("typ", String.class)).thenReturn("access");
        when(mockClaims.getSubject()).thenReturn(userId.toString());
        when(mockClaims.get("sid", String.class)).thenReturn(sessionId.toString());

        when(authSessionRepository.findByIdAndActiveTrue(sessionId)).thenReturn(Optional.of(mockSession));
        
        mockUser.setBlocked(true);
        when(appUserRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
        when(request.getRequestURI()).thenReturn("/api/test");

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    void testDoFilterInternal_RefreshToken_ProceedsWithoutAuth() throws Exception {
        Cookie[] cookies = {new Cookie("parkflow_access", "refresh_token")};
        when(request.getCookies()).thenReturn(cookies);
        
        when(jwtTokenService.parse("refresh_token")).thenReturn(mockClaims);
        when(mockClaims.get("typ", String.class)).thenReturn("refresh"); // is refresh token

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
