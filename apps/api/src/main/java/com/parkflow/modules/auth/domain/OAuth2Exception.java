package com.parkflow.modules.auth.domain;

public class OAuth2Exception extends RuntimeException {

    private final String errorCode;

    public OAuth2Exception(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }

    public OAuth2Exception(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public static OAuth2Exception invalidState() {
        return new OAuth2Exception("invalid_state", "Estado invalido o expirado. Intenta de nuevo.");
    }

    public static OAuth2Exception userNotFound() {
        return new OAuth2Exception("user_not_found", "No hay una cuenta de ParkFlow vinculada a este correo.");
    }

    public static OAuth2Exception userInactive() {
        return new OAuth2Exception("user_inactive", "Tu cuenta de ParkFlow esta desactivada.");
    }

    public static OAuth2Exception userBlocked() {
        return new OAuth2Exception("user_blocked", "Tu cuenta de ParkFlow esta bloqueada.");
    }

    public static OAuth2Exception invalidIdToken() {
        return new OAuth2Exception("invalid_id_token", "El token de identificacion del proveedor es invalido.");
    }

    public static OAuth2Exception providerMismatch() {
        return new OAuth2Exception("provider_mismatch", "El proveedor no coincide con la solicitud original.");
    }
}
