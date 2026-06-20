export type Theme = "light" | "dark" | "auto";

export const DEFAULT_PRIMARY_COLOR = "#D97757";

const LEGACY_PRIMARY_COLOR = "#f97316";

export function sanitizePrimaryColor(color: string): string {
  return color === LEGACY_PRIMARY_COLOR ? DEFAULT_PRIMARY_COLOR : color;
}

export interface BrandColors {
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
}
