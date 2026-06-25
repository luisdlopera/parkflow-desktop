package com.parkflow.modules.common.exception.domain;

@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})
public class BusinessValidationException extends DomainException {
    public BusinessValidationException(String message) {
        super("BUSINESS_VALIDATION_ERROR", message);
    }
    
    public BusinessValidationException(String code, String message) {
        super(code, message);
    }
}
