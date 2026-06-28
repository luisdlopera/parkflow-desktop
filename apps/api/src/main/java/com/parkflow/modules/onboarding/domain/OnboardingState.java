package com.parkflow.modules.onboarding.domain;

public enum OnboardingState {
  STEP_1_VEHICLE_TYPES(1),
  STEP_2_CAPACITY(2),
  STEP_3_RATES(3),
  STEP_4_LOCATION(4),
  STEP_5_SHIFTS(5),
  STEP_6_PAYMENT_METHODS(6),
  STEP_7_TICKETS(7),
  STEP_8_CUSTOMERS(8),
  STEP_9_AGREEMENTS(9),
  STEP_10_SITES(10),
  STEP_11_PERMISSIONS(11),
  STEP_12_AUDIT(12),
  COMPLETED(13),
  SKIPPED(14);

  private final int stepNumber;

  OnboardingState(int stepNumber) {
    this.stepNumber = stepNumber;
  }

  public int getStepNumber() {
    return stepNumber;
  }

  public static OnboardingState fromStepNumber(int step) {
    for (OnboardingState state : values()) {
      if (state.stepNumber == step) {
        return state;
      }
    }
    throw new IllegalArgumentException("Invalid step number: " + step);
  }
}
