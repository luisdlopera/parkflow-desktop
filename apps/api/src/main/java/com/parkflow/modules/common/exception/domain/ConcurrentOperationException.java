package com.parkflow.modules.common.exception.domain;

public class ConcurrentOperationException extends DomainException {
    public ConcurrentOperationException(String message) {
        super("CONCURRENT_OPERATION_ERROR", message);
    }
}
