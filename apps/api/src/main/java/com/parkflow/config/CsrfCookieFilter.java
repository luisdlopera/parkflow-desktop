package com.parkflow.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Forces the XSRF-TOKEN cookie to be issued on the first request so that
 * SPAs (ParkFlow web) can read it via document.cookie and echo it back
 * on subsequent mutating requests as the X-XSRF-TOKEN header.
 *
 * <p>Without this filter, Spring Security's deferred CsrfToken only
 * materialises the cookie when the application calls
 * {@code request.getAttribute("_csrf")} or when the CsrfFilter itself
 * validates a mutating request. With JWT-cookie authentication in a
 * STATELESS session, that means the first POST fails because the cookie
 * is not yet present.
 *
 * <p>Reference: Spring Security 6 SPA CSRF guidance
 * (CookieCsrfTokenRepository + eager resolution via filter).
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            // Resolving the deferred supplier materialises the cookie on the response.
            csrfToken.getToken();
        }
        filterChain.doFilter(request, response);
    }
}
