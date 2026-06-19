package com.parkflow.modules.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.dto.ErrorResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class OnboardingSecurityFilter extends OncePerRequestFilter {

    private final CompanyPort companyPort;
    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    // Endpoints que no deben bloquearse aunque el onboarding no esté completado
    private final List<String> allowedPaths = List.of(
        "/",
        "/api/v1/health",
        "/actuator/**",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/api/v1/auth/**",
        "/api/v1/onboarding/**",
        "/api/v1/configuration/theme",
        "/api/v1/configuration/payment-methods"
    );

    public OnboardingSecurityFilter(CompanyPort companyPort, ObjectMapper objectMapper) {
        this.companyPort = companyPort;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        
        boolean isAllowedPath = allowedPaths.stream().anyMatch(p -> pathMatcher.match(p, path));
        if (isAllowedPath) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthPrincipal principal) {
            UUID companyId = principal.companyId();
            if (companyId != null) {
                Company company = companyPort.findById(companyId).orElse(null);
                if (company != null && !Boolean.TRUE.equals(company.getOnboardingCompleted())) {
                    // Bloquear acceso porque el onboarding no está completo
                    writeForbiddenResponse(response, path);
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private void writeForbiddenResponse(HttpServletResponse response, String path) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        String correlationId = org.slf4j.MDC.get(com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
        
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "ONBOARDING_INCOMPLETE",
                "Debe completar el proceso de parametrización (onboarding) para acceder a esta función.",
                "AccessDeniedException",
                path,
                correlationId
        );
        
        objectMapper.writeValue(response.getWriter(), errorResponse);
    }
}
