// Core domain types
export type { TableRow, ActiveSession, ConfigRow, CashRegisterRow } from './common.types';

// Auth domain
export type { User, UserRole, Session, Permission, AuthState } from './auth.types';

// Cash domain
export type { CashSession, CashMovement, CashPolicy } from './cash.types';

// Parking domain
export type { VehicleType, ParkingSessionStatus, RateType } from './parking.types';

// API layer
export type { ApiResponse, PaginatedResponse, ApiErrorDetail, ApiErrorResponse, ApiError } from './api.types';
