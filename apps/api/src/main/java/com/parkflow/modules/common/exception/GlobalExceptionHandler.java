package com.parkflow.modules.common.exception;

import com.parkflow.modules.common.dto.ErrorResponse;
import com.parkflow.modules.parking.operation.exception.OperationException;
import jakarta.validation.ConstraintViolationException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import static com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY;

/**
 * Global exception handler providing standardized error responses.
 * All exceptions are converted to a consistent ErrorResponse format
 * with correlation IDs for traceability.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OperationException.class)
    public ResponseEntity<ErrorResponse> handleOperationException(
            OperationException ex, HttpServletRequest request) {
        
        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        ErrorResponse error = new ErrorResponse(
            ex.getStatus().value(),
            ex.getCode() != null ? ex.getCode() : "OPERATION_ERROR",
            ex.getMessage(),
            ex.getClass().getSimpleName() + ": " + ex.getMessage(),
            request.getRequestURI(),
            correlationId
        );

        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        Map<String, Object> details = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            details.put(error.getField(), error.getDefaultMessage())
        );

        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "VALIDATION_ERROR",
            "Revisa los datos ingresados.",
            ex.getMessage(),
            request.getRequestURI(),
            correlationId,
            details
        );

        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(
            ConstraintViolationException ex, HttpServletRequest request) {

        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        Map<String, Object> details = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String key = violation.getPropertyPath() != null
                ? violation.getPropertyPath().toString()
                : "request";
            details.put(key, violation.getMessage());
        });

        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "VALIDATION_ERROR",
            "Revisa los datos ingresados.",
            ex.getMessage(),
            request.getRequestURI(),
            correlationId,
            details
        );

        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {
        
        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        log.error("Unhandled exception [correlationId={}]", correlationId, ex);

        ErrorResponse error = new ErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "INTERNAL_ERROR",
            "Ocurrio un error inesperado. Intenta nuevamente.",
            ex.getClass().getName() + ": " + ex.getMessage(),
            request.getRequestURI(),
            correlationId
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        
        String correlationId = MDC.get(CORRELATION_ID_MDC_KEY);
        
        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "INVALID_ARGUMENT",
            "La solicitud no es valida.",
            ex.getMessage(),
            request.getRequestURI(),
            correlationId
        );

        return ResponseEntity.badRequest().body(error);
    }
}
