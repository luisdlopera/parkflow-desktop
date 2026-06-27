package com.parkflow.modules.common.exception.domain;

public abstract class DomainException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private final String code;

    public DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
