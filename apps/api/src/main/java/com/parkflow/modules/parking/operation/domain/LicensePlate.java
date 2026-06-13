package com.parkflow.modules.parking.operation.domain;

import com.parkflow.modules.common.exception.OperationException;
import org.springframework.http.HttpStatus;

public record LicensePlate(String value) {
  public LicensePlate {
    if (value == null || value.trim().isEmpty()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La placa no puede estar vacía");
    }
    String upper = value.trim().toUpperCase();
    if (!upper.matches("^[A-Z0-9]+$")) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Formato de placa inválido. Solo se permiten letras y números.");
    }
    value = upper;
  }
}
