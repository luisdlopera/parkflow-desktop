package com.parkflow.modules.common.exception.domain;

@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})
public class ConcurrentOperationException extends DomainException {
    public ConcurrentOperationException(String message) {
        super("CONCURRENT_OPERATION_ERROR", message);
    }
}
