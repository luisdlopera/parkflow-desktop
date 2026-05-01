package com.parkflow.modules.parking.operation.exception;

import org.springframework.http.HttpStatus;

public class OperationException extends RuntimeException {
  private final HttpStatus status;
  private final String code;

  public OperationException(HttpStatus status, String message) {
    this(status, null, message);
  }

  public OperationException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getCode() {
    return code;
  }
}
