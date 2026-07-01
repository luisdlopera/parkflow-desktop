package com.parkflow.modules.common.exception;



public class ValidationException extends BusinessException {
    private static final long serialVersionUID = 1L;

    public ValidationException(MessagesEnum messageEnum, Object... args) {
        super(messageEnum, args);
    }
}
