package com.parkflow.modules.parking.operation.exception;

import org.springframework.http.HttpStatus;

public class OperationException extends RuntimeException {
  private final HttpStatus status;

  public OperationException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
