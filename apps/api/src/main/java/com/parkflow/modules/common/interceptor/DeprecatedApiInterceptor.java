package com.parkflow.modules.common.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class DeprecatedApiInterceptor implements HandlerInterceptor {
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (handler instanceof HandlerMethod handlerMethod) {
            boolean isDeprecated = handlerMethod.getMethodAnnotation(Deprecated.class) != null || 
                                   handlerMethod.getBeanType().isAnnotationPresent(Deprecated.class);
            if (isDeprecated) {
                response.addHeader("Deprecation", "true");
                response.addHeader("X-Deprecated", "true");
                
                // Add a sunset date, e.g., 6 months from now. In a real system, you'd read a custom annotation.
                Instant sunset = Instant.now().plus(180, ChronoUnit.DAYS);
                response.addHeader("Sunset", sunset.toString());
                
                // Optional: A link to migration docs
                response.addHeader("Link", "<https://parkflow.com/api/docs/migrations>; rel=\"deprecation\"");
            }
        }
        return true;
    }
}
