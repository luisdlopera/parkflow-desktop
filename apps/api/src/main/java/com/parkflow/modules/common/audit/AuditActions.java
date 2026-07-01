package com.parkflow.modules.common.audit;

public enum AuditActions {
    USER_LOGIN("User logged in successfully"),
    USER_LOGOUT("User logged out"),
    PARKING_SESSION_CREATED("Parking session was created"),
    PARKING_SESSION_CLOSED("Parking session was closed"),
    PAYMENT_REGISTERED("Payment was registered"),
    CONFIGURATION_UPDATED("System configuration was updated"),
    RATE_CREATED("New rate was created"),
    RATE_UPDATED("Rate was updated"),
    ONBOARDING_COMPLETED("Company onboarding was completed"),
    TENANT_CREATED("New tenant was created"),
    ROLE_ASSIGNED("Role was assigned to user");

    private final String defaultDescription;

    AuditActions(String defaultDescription) {
        this.defaultDescription = defaultDescription;
    }

    public String getDefaultDescription() {
        return defaultDescription;
    }
}
