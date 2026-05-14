package com.parkflow.modules.onboarding.dto;

import java.util.List;

public record CompanyCapabilitiesResponse(
    boolean onboardingCompleted,
    boolean allowMultiLocation,
    boolean allowAdvancedPermissions,
    boolean cashEnabled,
    boolean shiftsEnabled,
    boolean clientsEnabled,
    boolean agreementsEnabled,
    int activeVehicleTypes,
    int activePaymentMethods,
    int activeSites,
    List<String> vehicleTypes,
    List<String> paymentMethods) {}
