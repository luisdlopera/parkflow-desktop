package com.parkflow.modules.common.exception;

import com.parkflow.modules.common.debug.AgentDebugNdjson;
import com.parkflow.modules.common.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import jakarta.persistence.OptimisticLockException;
import static com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

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
            Map.of("developerMessage", ex.getClass().getSimpleName() + ": " + ex.getMessage())
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
            Map.of("developerMessage", ex.getClass().getSimpleName() + ": " + ex.getMessage())
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
            Map.of("developerMessage", ex.getClass().getSimpleName() + ": " + ex.getMessage())
        );

        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        Map<String, Object> details = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            details.put(error.getField(), error.getDefaultMessage())
        );

        ApiResponse<Void> response = ApiResponse.error(
            "Revisa los datos ingresados.",
            "VALIDATION_ERROR",
            request.getRequestURI(),
            correlationId,
            details
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(
            RuntimeException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        ApiResponse<Void> response = ApiResponse.error(
            "No tienes permisos para realizar esta accion.",
            MessagesEnum.ACCESS_DENIED.getCode(),
            request.getRequestURI(),
            correlationId,
            Map.of("developerMessage", ex.getClass().getSimpleName() + ": " + ex.getMessage())
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
            ConstraintViolationException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        Map<String, Object> details = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String key = violation.getPropertyPath() != null
                ? violation.getPropertyPath().toString()
                : "request";
            details.put(key, violation.getMessage());
        });

        ApiResponse<Void> response = ApiResponse.error(
            "Revisa los datos ingresados.",
            "VALIDATION_ERROR",
            request.getRequestURI(),
            correlationId,
            details
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        String message = ex.getMostSpecificCause() != null
            ? ex.getMostSpecificCause().getMessage()
            : ex.getMessage();

        log.warn("Data integrity violation [correlationId={}]: {}", correlationId, message);

        ApiResponse<Void> response = ApiResponse.error(
            "La operacion no pudo completarse por un conflicto de datos. Verifique que el recurso no este duplicado.",
            "DATABASE_CONSTRAINT_ERROR",
            request.getRequestURI(),
            correlationId,
            Map.of("developerMessage", message)
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailure(
            Exception ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        log.warn("Optimistic locking failure [correlationId={}]: {}", correlationId, ex.getMessage());

        ApiResponse<Void> response = ApiResponse.error(
            "La operacion no pudo completarse porque otro usuario modifico la informacion. Por favor recarga e intenta de nuevo.",
            "CONCURRENT_MODIFICATION_ERROR",
            request.getRequestURI(),
            correlationId,
            Map.of("developerMessage", ex.getClass().getSimpleName() + ": " + ex.getMessage())
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.warn("Illegal state [correlationId={}]: {}", correlationId, ex.getMessage());

        ApiResponse<Void> response = ApiResponse.error(
            ex.getMessage(),
            "INVALID_STATE",
            request.getRequestURI(),
            correlationId,
            Map.of("developerMessage", ex.getClass().getName() + ": " + ex.getMessage())
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(InvalidDataAccessResourceUsageException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidDataAccess(
            InvalidDataAccessResourceUsageException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);

        log.error("Database query error [correlationId={}]: {}", correlationId, ex.getMessage());

        ApiResponse<Void> response = ApiResponse.error(
            "Error interno de base de datos. Contacta al administrador.",
            "DATABASE_QUERY_ERROR",
            request.getRequestURI(),
            correlationId,
            Map.of("developerMessage", ex.getClass().getName() + ": " + ex.getMessage())
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(
            Exception ex, HttpServletRequest request) {
        
        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        log.error("Unhandled exception [correlationId={}]", correlationId, ex);

        // #region agent log
        AgentDebugNdjson.line(
            "H6",
            "GlobalExceptionHandler.java:handleGenericException",
            "unhandled exception mapped to INTERNAL_ERROR 500",
            Map.ofEntries(
                Map.entry("uri", request.getRequestURI() != null ? request.getRequestURI() : ""),
                Map.entry(
                    "exception",
                    ex.getClass().getSimpleName())));
        // #endregion

        ApiResponse<Void> response = ApiResponse.error(
            "Ocurrio un error inesperado. Intenta nuevamente.",
            "INTERNAL_ERROR",
            request.getRequestURI(),
            correlationId,
            Map.of("developerMessage", ex.getClass().getName() + ": " + ex.getMessage())
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

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
            Map.of("developerMessage", ex.getClass().getName() + ": " + ex.getMessage())
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
            Map.of("developerMessage", ex.getMessage())
        );

        return ResponseEntity.badRequest().body(response);
    }
}
