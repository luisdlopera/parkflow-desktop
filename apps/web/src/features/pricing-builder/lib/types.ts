export type PricingStrategyType = "HOURLY" | "FRACTIONAL" | "DAILY" | "NIGHT" | "MIXED";
export type PricingRoundingMode = "NONE" | "UP" | "DOWN" | "NEAREST";
export type CurrencyCode = "COP";
export type PricingRuleId = "GRACE_PERIOD" | "MINIMUM_CHARGE" | "ROUNDING" | "STRATEGY_PRICE" | "DAILY_CAP";

export interface PricingStrategy {
  type: PricingStrategyType;
  label: string;
}

export interface PricingRules {
  executionOrder?: PricingRuleId[];
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
  vehicleOverrides?: Record<string, PricingVehicleOverride>;
  dailyCaps?: {
    enabled: boolean;
    maxDailyPrice?: number;
  };
}

export interface PricingVehicleOverride
  extends Partial<{
    rules: PricingRules;
    rates: PricingRates;
    strategy: PricingStrategy;
  }> {
  inheritsBase?: boolean;
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
  executionSteps?: PricingExecutionStep[];
  appliedRules?: PricingRuleId[];
  skippedRules?: PricingRuleId[];
  reason?: string;
}

export interface PricingCalculationInput {
  stayMinutes: number;
  vehicleType?: string;
  at?: Date;
}

export interface PricingOverrideDiff {
  path: string;
  label: string;
  baseValue: string;
  overrideValue: string;
}

export interface ResolvedPricingConfiguration extends PricingConfiguration {
  sourceVehicleType?: string;
  overrideApplied: boolean;
  overrideDiff: PricingOverrideDiff[];
}

export interface PricingExecutionStep {
  id: PricingRuleId | "INPUT" | "OVERRIDE_RESOLUTION" | "RESULT";
  label: string;
  before: string;
  after: string;
  applied: boolean;
  reason: string;
}

export interface PricingStrategyPriceResult {
  subtotal: number;
  chargedUnits: number;
  unitLabel: string;
  reason: string;
}

export interface ExplainablePricingPreview {
  input: PricingCalculationInput;
  resolvedConfig: ResolvedPricingConfiguration;
  executionSteps: PricingExecutionStep[];
  appliedRules: PricingRuleId[];
  skippedRules: PricingRuleId[];
  stayMinutes: number;
  billableMinutes: number;
  chargedUnits: number;
  subtotal: number;
  total: number;
  currency: CurrencyCode;
  strategyLabel: string;
  reason: string;
}

export interface ExportedPricingConfiguration {
  version: "pricing_engine_v1";
  currency: CurrencyCode;
  active: boolean;
  strategy: PricingStrategy;
  rates: PricingRates;
  rules: PricingRules & { executionOrder: PricingRuleId[] };
  overrides: Record<string, PricingVehicleOverride>;
}
