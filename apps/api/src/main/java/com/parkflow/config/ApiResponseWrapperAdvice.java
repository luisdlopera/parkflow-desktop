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

/**
 * Global response body advice that wraps all REST controller responses in the
 * canonical ParkFlow {@link ApiResponse} envelope.
 *
 * <h3>Fixes applied:</h3>
 * <ul>
 *   <li><strong>Fix #2 — String bypass eliminated:</strong> The {@code if (body instanceof String)}
 *       bypass has been removed. Jackson now takes priority over {@link
 *       org.springframework.http.converter.StringHttpMessageConverter} via the converter
 *       reordering in {@link WebMvcConfig#extendMessageConverters}. String-returning endpoints
 *       are now properly wrapped.</li>
 *
 *   <li><strong>Fix #3 — null / void handled:</strong> When the controller method returns
 *       {@code void} or a {@code null} body (e.g. DELETE operations, {@code ResponseEntity<Void>}),
 *       we now return {@code ApiResponse.empty()} instead of leaving the response body blank.
 *       An empty body causes {@code SyntaxError: Unexpected end of JSON input} in the frontend.</li>
 *
 *   <li><strong>Webhook safety:</strong> Methods annotated with {@code @RawResponse} bypass the
 *       envelope. Paths under {@code /v3/api-docs} and {@code /swagger-ui} are also excluded.</li>
 * </ul>
 *
 * <p>This advice covers only {@code com.parkflow.modules} — framework-internal responses
 * (e.g. actuator, Swagger) are excluded by the base package filter.
 */
@RestControllerAdvice(basePackages = {"com.parkflow.modules", "com.parkflow"})
public class ApiResponseWrapperAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        Class<?> paramType = returnType.getParameterType();

        // Never wrap already-wrapped responses, byte arrays, or streamed resources
        if (ApiResponse.class.isAssignableFrom(paramType)
                || byte[].class.isAssignableFrom(paramType)
                || org.springframework.core.io.Resource.class.isAssignableFrom(paramType)) {
            return false;
        }

        // Never wrap endpoints explicitly marked as raw (e.g. webhooks, file downloads)
        if (returnType.hasMethodAnnotation(RawResponse.class)
                || returnType.getDeclaringClass().isAnnotationPresent(RawResponse.class)) {
            return false;
        }

        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {

        String path = request.getURI().getPath();
        if (request instanceof ServletServerHttpRequest servletRequest) {
            path = servletRequest.getServletRequest().getRequestURI();
        }

        // Exclude documentation endpoints — they have their own schema
        if (path.contains("/v3/api-docs") || path.contains("/swagger-ui")) {
            return body;
        }

        String traceId = MDC.get(CORRELATION_ID_MDC_KEY);

        // Mark legacy transport surfaces explicitly so clients can phase them out.
        if (path.startsWith("/api/v1/settings/") || path.startsWith("/api/v1/configuration/")) {
            response.getHeaders().set("X-Deprecated", "true");
        }

        // FIX #2: String bypass REMOVED — Jackson now takes priority over StringHttpMessageConverter
        // via WebMvcConfig.extendMessageConverters(), so String bodies reach here as-is
        // and are correctly wrapped in the envelope like any other object.

        // Pass through already-wrapped responses (double-safety guard)
        if (body instanceof ApiResponse<?>) {
            return body;
        }

        // FIX #3: Handle null / void responses — produce canonical empty envelope
        // instead of leaving the response body blank (which causes frontend JSON parse errors).
        if (body == null) {
            return ApiResponse.empty(path, traceId);
        }

        // Handle Spring Data Page<T> — wrap with offset pagination meta
        if (body instanceof org.springframework.data.domain.Page<?> page) {
            return ApiResponse.paginated(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize(),
                path,
                traceId
            );
        }

        // Handle ParkFlow PageResponse<T> — wrap with offset pagination meta
        if (body instanceof com.parkflow.modules.common.dto.PageResponse<?> pr) {
            return ApiResponse.paginated(
                pr.content(),
                pr.totalElements(),
                pr.totalPages(),
                pr.page(),
                pr.size(),
                path,
                traceId
            );
        }

        return ApiResponse.success(body, path, traceId);
    }
}
