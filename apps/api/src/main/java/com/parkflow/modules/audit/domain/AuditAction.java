package com.parkflow.modules.audit.domain;

public enum AuditAction {
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    LOGOUT,
    TICKET_CREATED,
    TICKET_VOIDED,
    CASH_SESSION_OPENED,
    CASH_SESSION_CLOSED,
    SETTINGS_UPDATED
}
