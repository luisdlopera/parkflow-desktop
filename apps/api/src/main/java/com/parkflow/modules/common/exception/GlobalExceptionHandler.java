package com.parkflow.modules.common.exception;

import com.parkflow.modules.common.debug.AgentDebugNdjson;
import com.parkflow.modules.common.dto.ApiResponse;
import com.parkflow.modules.common.dto.ValidationIssue;
import jakarta.validation.ConstraintViolationException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import jakarta.persistence.OptimisticLockException;
import static com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY;

/**
 * Global exception handler that maps all unhandled exceptions to the canonical
 * ParkFlow {@link ApiResponse} envelope.
 *
 * <p>Security note: {@code developerMessage} is only included when the property
 * {@code app.debug.expose-developer-messages=true} is set. In production this
 * MUST remain {@code false} to prevent internal details (SQL, class names, stack
 * fragments) from leaking to API clients.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Controls whether internal error details are included in API responses.
     * MUST be {@code false} in production to prevent information leakage.
     * Set to {@code true} only in local/dev environments via application-dev.yml.
     */
    @Value("${app.debug.expose-developer-messages:false}")
    private boolean exposeDeveloperMessages;

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: build safe details map respecting the production flag
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Object> safeDetails(Exception ex) {
        if (exposeDeveloperMessages) {
            return Map.of("developerMessage", ex.getClass().getName() + ": " + ex.getMessage());
        }
        // In production: only expose the exception class name, never the message
        // (which may contain SQL, user data, or internal paths)
        return Map.of("type", ex.getClass().getSimpleName());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FIX #1 — ResponseStatusException (previously unhandled — sent raw Spring error)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Captures {@link ResponseStatusException} thrown directly in controllers
     * (e.g. "Company context required") and maps them to the canonical envelope.
     * Previously these bypassed the handler and returned Spring's default error body.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatusException(
            ResponseStatusException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        HttpStatusCode statusCode = ex.getStatusCode();
        String httpCode = "HTTP_" + statusCode.value();

        String userMessage = ex.getReason() != null
                ? ex.getReason()
                : "La solicitud no pudo procesarse.";

        log.warn("ResponseStatusException [correlationId={}, status={}, reason={}]",
                correlationId, statusCode, ex.getReason());

        ApiResponse<Void> response = ApiResponse.error(
            userMessage,
            httpCode,
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(statusCode).body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Domain exceptions
    // ─────────────────────────────────────────────────────────────────────────

    @ExceptionHandler(com.parkflow.modules.common.exception.domain.DomainException.class)
    public ResponseEntity<ApiResponse<Void>> handleDomainException(
            com.parkflow.modules.common.exception.domain.DomainException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        HttpStatus status = switch (ex) {
            case com.parkflow.modules.common.exception.domain.EntityNotFoundException e -> HttpStatus.NOT_FOUND;
            case com.parkflow.modules.common.exception.domain.BusinessValidationException e -> HttpStatus.BAD_REQUEST;
            case com.parkflow.modules.common.exception.domain.ConcurrentOperationException e -> HttpStatus.CONFLICT;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        String code = ex.getCode();
        if ("BUSINESS_VALIDATION_ERROR".equals(code)) {
            code = "OPERATION_ERROR";
        }

        ApiResponse<Void> response = ApiResponse.error(
            ex.getMessage(),
            code,
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler(OperationException.class)
    public ResponseEntity<ApiResponse<Void>> handleOperationException(
            OperationException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            ex.getMessage(),
            ex.getCode() != null ? ex.getCode() : "OPERATION_ERROR",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(
            BusinessException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            ex.getMessage(),
            ex.getCode() != null ? ex.getCode() : "OPERATION_ERROR",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FIX #5 — Validation errors now produce canonical ValidationIssue[] array
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Maps Spring MVC's {@link MethodArgumentNotValidException} to the canonical
     * {@code ValidationIssue[]} format defined in the API contract spec.
     * Previously returned {@code Map<String,Object>} — now returns structured issues.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        List<ValidationIssue> issues = ex.getBindingResult().getFieldErrors().stream()
            .map(fieldError -> new ValidationIssue(
                fieldError.getField(),
                fieldError.getCode() != null ? fieldError.getCode() : "INVALID",
                fieldError.getDefaultMessage() != null
                    ? fieldError.getDefaultMessage()
                    : "El campo es inválido",
                fieldError.getRejectedValue()
            ))
            .toList();

        ApiResponse<Void> response = ApiResponse.validationError(
            "Revisa los datos ingresados.",
            request.getRequestURI(),
            correlationId,
            issues
        );

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Maps Jakarta's {@link ConstraintViolationException} (service/param-level validation)
     * to the same canonical {@code ValidationIssue[]} format.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
            ConstraintViolationException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        List<ValidationIssue> issues = ex.getConstraintViolations().stream()
            .map(violation -> new ValidationIssue(
                violation.getPropertyPath() != null ? violation.getPropertyPath().toString() : "request",
                violation.getConstraintDescriptor() != null
                    ? violation.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName().toUpperCase()
                    : "CONSTRAINT_VIOLATION",
                violation.getMessage(),
                violation.getInvalidValue()
            ))
            .toList();

        ApiResponse<Void> response = ApiResponse.validationError(
            "Revisa los datos ingresados.",
            request.getRequestURI(),
            correlationId,
            issues
        );

        return ResponseEntity.badRequest().body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Access control
    // ─────────────────────────────────────────────────────────────────────────

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(
            RuntimeException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            "No tienes permisos para realizar esta accion.",
            MessagesEnum.ACCESS_DENIED.getCode(),
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Data integrity / concurrency
    // ─────────────────────────────────────────────────────────────────────────

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        // FIX #4: never log or return the specific DB constraint message (contains table/column names)
        log.warn("Data integrity violation [correlationId={}]: {}", correlationId, ex.getClass().getSimpleName());

        ApiResponse<Void> response = ApiResponse.error(
            "La operacion no pudo completarse por un conflicto de datos. Verifique que el recurso no este duplicado.",
            "DATABASE_CONSTRAINT_ERROR",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailure(
            Exception ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.warn("Optimistic locking failure [correlationId={}]", correlationId);

        ApiResponse<Void> response = ApiResponse.error(
            "La operacion no pudo completarse porque otro usuario modifico la informacion. Por favor recarga e intenta de nuevo.",
            "CONCURRENT_MODIFICATION_ERROR",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.warn("Illegal state [correlationId={}]", correlationId);

        ApiResponse<Void> response = ApiResponse.error(
            ex.getMessage(),
            "INVALID_STATE",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(InvalidDataAccessResourceUsageException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidDataAccess(
            InvalidDataAccessResourceUsageException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.error("Database query error [correlationId={}]", correlationId, ex);

        ApiResponse<Void> response = ApiResponse.error(
            "Error interno de base de datos. Contacta al administrador.",
            "DATABASE_QUERY_ERROR",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Routing
    // ─────────────────────────────────────────────────────────────────────────

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(
            NoResourceFoundException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        String path = request.getRequestURI();

        log.warn("No resource found [correlationId={}, path={}]", correlationId, path);

        ApiResponse<Void> response = ApiResponse.error(
            "El recurso solicitado no existe o no esta disponible.",
            "NOT_FOUND",
            path,
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            "La solicitud no es valida.",
            "INVALID_ARGUMENT",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.badRequest().body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Authentication / parameter / HTTP method / media type
    // ─────────────────────────────────────────────────────────────────────────

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(
            org.springframework.security.core.AuthenticationException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.warn("AuthenticationException [correlationId={}]", correlationId);

        ApiResponse<Void> response = ApiResponse.error(
            "Tu sesion ha expirado o no estas autenticado.",
            "AUTH_UNAUTHORIZED",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.warn("HttpMessageNotReadable [correlationId={}]", correlationId);

        ApiResponse<Void> response = ApiResponse.error(
            "El cuerpo de la solicitud JSON es invalido o no pudo leerse.",
            "MALFORMED_REQUEST",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingServletRequestParameter(
            org.springframework.web.bind.MissingServletRequestParameterException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            "Falta el parametro requerido: " + ex.getParameterName(),
            "MISSING_PARAMETER",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        String typeName = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "valido";
        ApiResponse<Void> response = ApiResponse.error(
            "El parametro '" + ex.getName() + "' debe ser de tipo " + typeName,
            "TYPE_MISMATCH",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpRequestMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            "Metodo HTTP no soportado para esta ruta.",
            "METHOD_NOT_SUPPORTED",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(response);
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMediaTypeNotSupported(
            org.springframework.web.HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            "Tipo de contenido (Content-Type) no soportado.",
            "UNSUPPORTED_MEDIA_TYPE",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Catch-all fallback (must remain last)
    // ─────────────────────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(
            Exception ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.error("Unhandled exception [correlationId={}]", correlationId, ex);

        if (exposeDeveloperMessages) {
            AgentDebugNdjson.line(
                "H6",
                "GlobalExceptionHandler.java:handleGenericException",
                "unhandled exception mapped to INTERNAL_ERROR 500",
                Map.ofEntries(
                    Map.entry("uri", request.getRequestURI() != null ? request.getRequestURI() : ""),
                    Map.entry("exception", ex.getClass().getSimpleName())));
        }

        ApiResponse<Void> response = ApiResponse.error(
            "Ocurrio un error inesperado. Intenta nuevamente.",
            "INTERNAL_ERROR",
            request.getRequestURI(),
            correlationId,
            safeDetails(ex)
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
