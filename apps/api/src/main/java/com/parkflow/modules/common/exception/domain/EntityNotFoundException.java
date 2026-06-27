package com.parkflow.modules.common.exception.domain;

public class EntityNotFoundException extends DomainException {
    private static final long serialVersionUID = 1L;

    public EntityNotFoundException(String entity, String identifier) {
        super("NOT_FOUND", String.format("%s %s no encontrado", entity, identifier));
    }

    public EntityNotFoundException(String message) {
        super("NOT_FOUND", message);
    }
}
