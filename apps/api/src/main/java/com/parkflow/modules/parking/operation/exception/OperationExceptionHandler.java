package com.parkflow.modules.parking.operation.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class OperationExceptionHandler {

  @ExceptionHandler(OperationException.class)
  public ResponseEntity<Map<String, Object>> handleOperation(OperationException exception) {
    return ResponseEntity.status(exception.getStatus()).body(Map.of("error", exception.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(
            Map.of(
                "error", "Validation failed",
                "details", exception.getBindingResult().toString()));
  }
}
