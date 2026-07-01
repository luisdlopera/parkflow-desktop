package com.parkflow.config;

import com.parkflow.modules.common.dto.ApiResponse;

import org.slf4j.MDC;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import static com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY;

@RestControllerAdvice(basePackages = "com.parkflow.modules")
public class ApiResponseWrapperAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        Class<?> paramType = returnType.getParameterType();
        return !ApiResponse.class.isAssignableFrom(paramType) &&
               !byte[].class.isAssignableFrom(paramType) &&
               !org.springframework.core.io.Resource.class.isAssignableFrom(paramType);
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        
        String path = request.getURI().getPath();
        if (request instanceof ServletServerHttpRequest servletRequest) {
            path = servletRequest.getServletRequest().getRequestURI();
        }
        
        if (path.contains("/v3/api-docs") || path.contains("/swagger-ui")) {
            return body;
        }

        String traceId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        if (body instanceof String) {
            return body; // StringHttpMessageConverter gotcha bypass
        }
        if (body instanceof ApiResponse) {
            return body;
        }

        return ApiResponse.success(body, path, traceId);
    }
}
