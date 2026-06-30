export type PricingStrategyType = "HOURLY" | "FRACTIONAL" | "DAILY" | "NIGHT" | "MIXED";
export type PricingRoundingMode = "NONE" | "UP" | "DOWN" | "NEAREST";
export type CurrencyCode = "COP";

export interface PricingStrategy {
  type: PricingStrategyType;
  label: string;
}

export interface PricingRules {
  graceMinutes: number;
  minimumChargeMinutes: number;
  rounding: {
    mode: PricingRoundingMode;
    incrementMinutes?: number;
  };
  specialHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  weekends?: {
    enabled: boolean;
    surchargePercent?: number;
    fixedPrice?: number;
  };
  vehicleOverrides?: Record<
    string,
    Partial<{
      rules: PricingRules;
      rates: PricingRates;
      strategy: PricingStrategy;
    }>
  >;
  dailyCaps?: {
    enabled: boolean;
    maxDailyPrice?: number;
  };
}

export interface PricingRates {
  pricePerHour?: number;
  fractionMinutes?: number;
  fractionPrice?: number;
  dailyPrice?: number;
  nightPrice?: number;
  mixed?: {
    pricePerHour?: number;
    dailyPrice?: number;
    nightPrice?: number;
  };
}

export interface PricingConfiguration {
  id?: string;
  name: string;
  siteId?: string | null;
  site?: string | null;
  vehicleType?: string | null;
  strategy: PricingStrategy;
  rules: PricingRules;
  rates: PricingRates;
  advancedMode: boolean;
  active: boolean;
  currency: CurrencyCode;
}

export type PricingBuilderMode = "onboarding" | "configuration";

export type PricingBuilderErrors = Record<string, string>;

export interface PricingPreviewLine {
  label: string;
  value: string;
}

export interface PricingPreview {
  stayMinutes: number;
  billableMinutes: number;
  chargedUnits: number;
  total: number;
  currency: CurrencyCode;
  strategyLabel: string;
  lines: PricingPreviewLine[];
}
