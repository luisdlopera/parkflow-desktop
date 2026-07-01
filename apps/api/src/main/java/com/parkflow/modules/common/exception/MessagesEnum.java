package com.parkflow.modules.common.exception;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public enum MessagesEnum {
    // Auth Errors
    AUTH_INVALID_CREDENTIALS("AUTH_INVALID_CREDENTIALS", "Credenciales invalidas", HttpStatus.UNAUTHORIZED, "AUTH"),
    AUTH_SESSION_EXPIRED("AUTH_SESSION_EXPIRED", "Tu sesion ha expirado", HttpStatus.UNAUTHORIZED, "AUTH"),
    ACCESS_DENIED("ACCESS_DENIED", "No tienes permisos para realizar esta accion", HttpStatus.FORBIDDEN, "AUTH"),
    
    // Business Errors - Parking
    PARKING_SESSION_NOT_FOUND("PARKING_SESSION_NOT_FOUND", "La sesion de parqueo no existe", HttpStatus.NOT_FOUND, "BUSINESS"),
    PARKING_FULL("PARKING_FULL", "El parqueadero esta lleno", HttpStatus.CONFLICT, "BUSINESS"),
    ACTIVE_SESSION_EXISTS("ACTIVE_SESSION_EXISTS", "El vehiculo ya tiene una sesion activa", HttpStatus.CONFLICT, "BUSINESS"),
    VEHICLE_PLATE_REQUIRED("VEHICLE_PLATE_REQUIRED", "La placa del vehiculo es requerida", HttpStatus.BAD_REQUEST, "BUSINESS"),
    TICKET_NOT_FOUND("TICKET_NOT_FOUND", "El tiquete no fue encontrado", HttpStatus.NOT_FOUND, "BUSINESS"),
    PARKING_RATE_NOT_FOUND("PARKING_RATE_NOT_FOUND", "La tarifa no fue encontrada", HttpStatus.NOT_FOUND, "BUSINESS"),

    // Cash Register
    CASH_REGISTER_CLOSED("CASH_REGISTER_CLOSED", "La caja esta cerrada. Debes abrir caja primero.", HttpStatus.BAD_REQUEST, "BUSINESS"),
    
    // Company / Onboarding
    COMPANY_NOT_FOUND("COMPANY_NOT_FOUND", "La compañia no existe", HttpStatus.NOT_FOUND, "BUSINESS"),
    COMPANY_ALREADY_EXISTS("COMPANY_ALREADY_EXISTS", "La compañia ya existe", HttpStatus.CONFLICT, "BUSINESS"),
    ONB_MUST_SELECT_OPTION("ONB_MUST_SELECT_OPTION", "Debes seleccionar una opcion para continuar", HttpStatus.BAD_REQUEST, "BUSINESS"),

    // System
    INTERNAL_ERROR("INTERNAL_ERROR", "Ocurrio un error inesperado", HttpStatus.INTERNAL_SERVER_ERROR, "SYSTEM");

    private final String code;
    private final String defaultMessage;
    private final HttpStatus httpStatus;
    private final String category;

    MessagesEnum(String code, String defaultMessage, HttpStatus httpStatus, String category) {
        this.code = code;
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
        this.category = category;
    }
}
