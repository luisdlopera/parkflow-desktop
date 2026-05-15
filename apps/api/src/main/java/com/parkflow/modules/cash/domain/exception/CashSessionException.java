package com.parkflow.modules.cash.domain.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class CashSessionException extends RuntimeException {
    private final HttpStatus status;

    public CashSessionException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
