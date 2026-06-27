package com.parkflow.modules.common.exception.domain;

public class ConcurrentOperationException extends DomainException {
    private static final long serialVersionUID = 1L;

    public ConcurrentOperationException(String message) {
        super("CONCURRENT_OPERATION_ERROR", message);
    }
}
