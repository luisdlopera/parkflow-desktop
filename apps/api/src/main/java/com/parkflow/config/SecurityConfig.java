package com.parkflow.config;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.parkflow.modules.auth.security.JwtAuthFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
  private String allowedOrigins;

  @Value("${app.security.api-key:parkflow-dev-key}")
  private String apiKey;

  private final Environment environment;

  @Value("${app.security.swagger-public:false}")
  private boolean swaggerPublic;

  @Value("${app.security.seed-admin-password:}")
  private String seedAdminPassword;

  @Value("${app.security.jwt-secret:}")
  private String jwtSecret;

  @Value("${app.security.password-encoder-strength:12}")
  private int passwordEncoderStrength;

  private final JwtAuthFilter jwtAuthFilter;
  private final com.parkflow.modules.auth.security.OnboardingSecurityFilter onboardingSecurityFilter;
  private final ObjectMapper objectMapper;

  public SecurityConfig(JwtAuthFilter jwtAuthFilter,
      com.parkflow.modules.auth.security.OnboardingSecurityFilter onboardingSecurityFilter,
      ObjectMapper objectMapper,
      Environment environment) {
    this.jwtAuthFilter = jwtAuthFilter;
    this.onboardingSecurityFilter = onboardingSecurityFilter;
    this.objectMapper = objectMapper;
    this.environment = environment;
  }

  /**
   * Fail fast if placeholder secrets are used outside the dev/test profiles.
   * Prevents accidental production deployments with insecure defaults.
   */
  @PostConstruct
  public void validateSecrets() {
    Set<String> nonProdProfiles = Set.of("dev", "local", "test", "ci");
    String[] profiles = environment.getActiveProfiles();
    // If no profiles are active, assume local development to avoid blocking a common dev workflow
    if (profiles == null || profiles.length == 0) return;
    boolean isDev = Arrays.stream(profiles).anyMatch(p -> nonProdProfiles.contains(p.toLowerCase()));
    if (isDev) return;

    if (apiKey.isBlank() || apiKey.startsWith("REPLACE_") || apiKey.equals("parkflow-dev-key")) {
      throw new IllegalStateException(
          "SECURITY: app.security.api-key must be set to a secure value via PARKFLOW_API_KEY env var");
    }
    if (seedAdminPassword.isBlank() || seedAdminPassword.startsWith("REPLACE_")) {
      throw new IllegalStateException(
          "SECURITY: app.security.seed-admin-password must be set via PARKFLOW_SEED_ADMIN_PASSWORD env var");
    }
    if (jwtSecret.isBlank() || jwtSecret.startsWith("REPLACE_")) {
      throw new IllegalStateException(
          "SECURITY: app.security.jwt-secret must be set via PARKFLOW_JWT_SECRET_BASE64 env var");
    }
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.cors(Customizer.withDefaults())
        .csrf(csrf -> csrf.disable())
        .exceptionHandling(
            ex ->
                ex.authenticationEntryPoint(this::handleUnauthorized)
                    .accessDeniedHandler(this::handleForbidden))
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers(
                        "/",
                        "/uploads/**",
                        "/api/v1/health",
                        "/actuator/health",
                        "/actuator/info",
                        "/actuator/prometheus",
                        "/api/v1/auth/login",
                        "/api/v1/auth/refresh",
                        "/api/v1/auth/restore-session",
                        "/api/v1/auth/password-reset/request",
                        "/api/v1/auth/password-reset/confirm",
                        "/api/v1/auth/setup-required")
                    .permitAll()
                    .requestMatchers(swaggerMatchers())
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(new ApiKeyAuthFilter(apiKey), UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterAfter(onboardingSecurityFilter, JwtAuthFilter.class);
    return http.build();
  }

  private String[] swaggerMatchers() {
    if (swaggerPublic) {
      return new String[] {"/swagger-ui/**", "/v3/api-docs/**"};
    }
    boolean isDev = Arrays.stream(environment.getActiveProfiles())
        .anyMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("local"));
    return isDev ? new String[] {"/swagger-ui/**", "/v3/api-docs/**"} : new String[] {};
  }

  private void handleUnauthorized(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
      throws java.io.IOException {
    writeSecurityError(
        response,
        HttpServletResponse.SC_UNAUTHORIZED,
        "AUTH_UNAUTHORIZED",
        "Tu sesion expiro. Inicia sesion nuevamente.",
        request.getRequestURI());
  }

  private void handleForbidden(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
      throws java.io.IOException {
    writeSecurityError(
        response,
        HttpServletResponse.SC_FORBIDDEN,
        "AUTH_FORBIDDEN",
        "No tienes permisos para realizar esta accion.",
        request.getRequestURI());
  }

  private void writeSecurityError(
      HttpServletResponse response, int status, String code, String message, String path)
      throws java.io.IOException {
    String correlationId = org.slf4j.MDC.get(com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    ErrorResponse payload = new ErrorResponse(status, code, message, status == 401 ? "AuthenticationException" : "AccessDeniedException", path, correlationId);
    objectMapper.writeValue(response.getWriter(), payload);
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(passwordEncoderStrength);
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
    config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(Arrays.asList("*"));
    config.setExposedHeaders(Arrays.asList(CorrelationIdFilter.CORRELATION_ID_HEADER)); // Expose correlation ID to clients
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
