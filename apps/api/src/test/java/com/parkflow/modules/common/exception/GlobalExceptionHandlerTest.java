package com.parkflow.modules.common.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.dto.ErrorResponse;
import com.parkflow.modules.parking.operation.exception.OperationException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/test");
        // Clear MDC before each test
        MDC.clear();
    }

    @Test
    @DisplayName("Should handle OperationException with error code")
    void shouldHandleOperationExceptionWithCode() {
        MDC.put("correlationId", "test-corr-id");
        OperationException ex = new OperationException(HttpStatus.BAD_REQUEST, "INVALID_PLATE", "Plate number is invalid");

        ResponseEntity<ErrorResponse> response = handler.handleOperationException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().errorCode()).isEqualTo("INVALID_PLATE");
        assertThat(response.getBody().userMessage()).isEqualTo("Plate number is invalid");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/test");
        assertThat(response.getBody().correlationId()).isEqualTo("test-corr-id");
        assertThat(response.getBody().timestamp()).isNotNull();
    }

    @Test
    @DisplayName("Should handle OperationException without error code")
    void shouldHandleOperationExceptionWithoutCode() {
        MDC.put("correlationId", "test-corr-id-2");
        OperationException ex = new OperationException(HttpStatus.NOT_FOUND, "Resource not found");

        ResponseEntity<ErrorResponse> response = handler.handleOperationException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(404);
        assertThat(response.getBody().errorCode()).isEqualTo("OPERATION_ERROR");
    }

    @Test
    @DisplayName("Should handle validation errors with field details")
    void shouldHandleValidationErrors() {
        MDC.put("correlationId", "test-corr-id-3");
        
        // Create a mock validation exception
        Object target = new Object();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(target, "target");
        bindingResult.addError(new FieldError("target", "plate", "Plate cannot be blank"));
        bindingResult.addError(new FieldError("target", "vehicleType", "Invalid vehicle type"));
        
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<ErrorResponse> response = handler.handleValidationException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().errorCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().details()).isNotNull();
        assertThat(response.getBody().details()).containsKeys("plate", "vehicleType");
    }

    @Test
    @DisplayName("Should handle generic exceptions with internal error code")
    void shouldHandleGenericExceptions() {
        MDC.put("correlationId", "test-corr-id-4");
        Exception ex = new RuntimeException("Something went wrong");

        ResponseEntity<ErrorResponse> response = handler.handleGenericException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(500);
        assertThat(response.getBody().errorCode()).isEqualTo("INTERNAL_ERROR");
        assertThat(response.getBody().userMessage()).isEqualTo("Ocurrio un error inesperado. Intenta nuevamente.");
    }

    @Test
    @DisplayName("Should handle illegal argument exceptions")
    void shouldHandleIllegalArgumentExceptions() {
        MDC.put("correlationId", "test-corr-id-5");
        IllegalArgumentException ex = new IllegalArgumentException("La solicitud no es valida.");

        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgument(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().errorCode()).isEqualTo("INVALID_ARGUMENT");
        assertThat(response.getBody().userMessage()).isEqualTo("La solicitud no es valida.");
    }
}
