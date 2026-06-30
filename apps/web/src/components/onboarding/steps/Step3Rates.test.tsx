import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import Step3Rates from "./Step3Rates";
import { OnboardingProvider } from "../OnboardingContext";

vi.mock("@/hooks/auth/useOnboardingStatus", () => ({
  useOnboardingStatus: vi.fn(),
}));

vi.mock("@/lib/api/onboarding.api", () => ({
  saveOnboardingStep: vi.fn(async () => ({
    companyId: "c1",
    plan: "PRO",
    onboardingCompleted: false,
    currentStep: 3,
    skipped: false,
    progressData: {},
    availableOptionsByPlan: {},
    enabledSteps: [1, 2, 4, 3, 5, 6, 7, 8, 9, 10, 11, 12],
  })),
}));

import * as useOnboardingStatusHook from "@/hooks/auth/useOnboardingStatus";

const baseStatus = {
  companyId: "c1",
  plan: "PRO" as const,
  onboardingCompleted: false,
  currentStep: 3,
  skipped: false,
  progressData: {
    step_1: { vehicleTypes: ["CAR", "MOTORCYCLE"] },
    step_3: {
      billingModel: "HOURLY",
      baseValue: 1000,
      hasNightRate: true,
      nightRate: 1500,
      nightStartTime: "20:00",
      nightEndTime: "06:00",
      enableRateByType: true,
      ratesByType: { CAR: 1200 },
    },
    step_4: { countryCode: "AR" },
  },
  availableOptionsByPlan: {},
  enabledSteps: [1, 2, 4, 3, 5, 6, 7, 8, 9, 10, 11, 12],
};

function renderWithOnboarding(ui: React.ReactElement) {
  return render(
    <OnboardingProvider companyId="c1" onDone={vi.fn()}>
      {ui}
    </OnboardingProvider>
  );
}

describe("Step3Rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOnboardingStatusHook.useOnboardingStatus).mockReturnValue({
      data: baseStatus as any,
      isLoading: false,
      mutate: vi.fn(),
      error: undefined,
      isValidating: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the pricing builder wizard and simulator", async () => {
    renderWithOnboarding(<Step3Rates />);

    expect(await screen.findByText("Configura tus tarifas")).toBeInTheDocument();
    expect(screen.getByText("Estrategia")).toBeInTheDocument();
    expect(screen.getByText("Valores")).toBeInTheDocument();
    expect(screen.getByText("Reglas")).toBeInTheDocument();
    expect(screen.getByText("Simulador")).toBeInTheDocument();
    expect(document.getElementById("pricing-builder-step3")).toBeTruthy();
  });

  it("does not render vehicle override inputs before advanced rules are opened", async () => {
    vi.mocked(useOnboardingStatusHook.useOnboardingStatus).mockReturnValue({
      data: {
        ...baseStatus,
        progressData: {
          ...baseStatus.progressData,
          step_1: { vehicleTypes: ["CAR"] },
        },
      } as any,
      isLoading: false,
      mutate: vi.fn(),
      error: undefined,
      isValidating: false,
    });

    renderWithOnboarding(<Step3Rates />);

    expect(await screen.findByText("Configura tus tarifas")).toBeInTheDocument();
    expect(screen.queryByText("Overrides por vehículo")).not.toBeInTheDocument();
  });

});
