package com.parkflow.config;

import java.util.Arrays;
import java.util.stream.Stream;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
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

  @Value("${spring.profiles.active:}")
  private String activeProfiles;

  @Value("${app.security.swagger-public:true}")
  private boolean swaggerPublic;

  private final JwtAuthFilter jwtAuthFilter;
  private final ObjectMapper objectMapper;

  public SecurityConfig(JwtAuthFilter jwtAuthFilter, ObjectMapper objectMapper) {
    this.jwtAuthFilter = jwtAuthFilter;
    this.objectMapper = objectMapper;
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
                        "/api/v1/health",
                        "/actuator/health",
                        "/actuator/info",
                        "/actuator/prometheus",
                        "/api/v1/auth/login",
                        "/api/v1/auth/refresh",
                        "/api/v1/auth/password-reset/request",
                        "/api/v1/auth/password-reset/confirm",
                        "/api/v1/settings/vehicle-types")
                    .permitAll()
                    .requestMatchers(swaggerMatchers())
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(new ApiKeyAuthFilter(apiKey), UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  private String[] swaggerMatchers() {
    if (swaggerPublic) {
      return new String[] {"/swagger-ui/**", "/v3/api-docs/**"};
    }
    boolean isDev =
        Stream.of(activeProfiles.split(","))
            .map(String::trim)
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
    ErrorResponse payload = new ErrorResponse(status, code, message, path, correlationId);
    objectMapper.writeValue(response.getWriter(), payload);
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
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
