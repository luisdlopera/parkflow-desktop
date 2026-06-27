package com.parkflow.modules.reports.domain.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ReportException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private final HttpStatus status;

    public ReportException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public ReportException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }
}
