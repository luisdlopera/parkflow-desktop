package com.parkflow.modules.common.exception.domain;

@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})
public class EntityNotFoundException extends DomainException {
    public EntityNotFoundException(String entity, String identifier) {
        super("NOT_FOUND", String.format("%s %s no encontrado", entity, identifier));
    }

    public EntityNotFoundException(String message) {
        super("NOT_FOUND", message);
    }
}
