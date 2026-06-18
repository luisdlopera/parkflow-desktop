/**
 * Backward-compatible barrel. All exports are now in lib/api/ domain modules.
 * Import directly from the domain module for new code:
 *   import { fetchRates } from "@/lib/api/rates-api"
 */
export * from "@/lib/api/rates-api";
export * from "@/lib/api/users-api";
export * from "@/lib/api/parameters-api";
export * from "@/lib/api/vehicle-types-api";
export * from "@/lib/api/sites-api";
export * from "@/lib/api/payment-methods-api";
export * from "@/lib/api/printers-api";
export * from "@/lib/api/cash-registers-api";
export * from "@/lib/api/operational-parameters-api";
export * from "@/lib/api/rate-fractions-api";
export * from "@/lib/api/monthly-contracts-api";
export * from "@/lib/api/agreements-api";
export * from "@/lib/api/prepaid-api";
export * from "@/lib/api/theme-api";
export { apiV1Base, cfgBase, apiFetch, hdr, type SettingsPage } from "@/lib/api/_shared";
