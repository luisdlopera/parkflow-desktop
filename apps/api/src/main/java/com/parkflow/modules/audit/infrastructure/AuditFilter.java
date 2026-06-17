package com.parkflow.modules.audit.infrastructure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.parkflow.modules.auth.domain.AppUser;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class AuditFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        try {
            String correlationId = UUID.randomUUID().toString();
            String ipAddress = extractIpAddress(request);
            String userAgent = request.getHeader("User-Agent");
            
            // Extract user from security context if available
            UUID userId = null;
            String username = "ANONYMOUS";
            String role = null;

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                username = auth.getName();
                if (auth.getPrincipal() instanceof AppUser) {
                    AppUser user = (AppUser) auth.getPrincipal();
                    userId = user.getId();
                }
                role = auth.getAuthorities().stream().findFirst().map(a -> a.getAuthority()).orElse(null);
            }

            AuditContextHolder.AuditContext context = AuditContextHolder.AuditContext.builder()
                    .correlationId(correlationId)
                    .userId(userId)
                    .username(username)
                    .role(role)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .build();

            AuditContextHolder.setContext(context);

            filterChain.doFilter(request, response);
        } finally {
            AuditContextHolder.clearContext();
        }
    }

    private String extractIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
