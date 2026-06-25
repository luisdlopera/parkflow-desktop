package com.parkflow.modules.common.exception.domain;

@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})
public abstract class DomainException extends RuntimeException {
    private final String code;

    public DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
