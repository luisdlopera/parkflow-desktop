/**
 * Common type definitions used across the application.
 * Centralized to avoid duplication and weak typing with `any`.
 */

// Generic table/list row type when specific type is deferred
export type TableRow = { id: string; [key: string]: unknown };

// Active session domain
export type ActiveSession = {
  ticketNumber: string;
  entryAt: string;
  plate: string;
  vehicleType: string;
  parkingSpaceCode?: string;
  rateName?: string;
  occupiedSpaces?: unknown[];
};

// Configuration domain
export type ConfigRow = { id: string; code?: string; name?: string; isActive?: boolean; active?: boolean };

// Cash register domain
export type CashRegisterRow = ConfigRow & { terminal: string; printerName?: string };
export type CashSession = { id: string; openedAt: string; closedAt?: string };

// Vehicle domain
export type Vehicle = { id: string; plate: string; type: string };
export type VehicleType = string;

// Error response from API
export type ApiErrorDetail = {
  message?: string;
  code?: string;
  field?: string;
};

export type ApiErrorResponse = {
  details?: ApiErrorDetail[];
  message?: string;
};
