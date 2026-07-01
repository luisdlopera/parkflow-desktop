package com.parkflow.modules.common.exception;

import org.springframework.http.HttpStatus;

import java.text.MessageFormat;

public class BusinessException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final MessagesEnum messageEnum;
    private final transient Object[] args;

    public BusinessException(MessagesEnum messageEnum, Object... args) {
        super(MessageFormat.format(messageEnum.getDefaultMessage(), args));
        this.messageEnum = messageEnum;
        this.args = args;
    }

    public MessagesEnum getMessageEnum() {
        return messageEnum;
    }
    
    public String getCode() {
        return messageEnum.getCode();
    }
    
    public HttpStatus getStatus() {
        return messageEnum.getHttpStatus();
    }
}
