/**
 * API layer types.
 * Request/response shapes for backend communication.
 */

export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
};

export type PaginatedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type ApiErrorDetail = {
  message?: string;
  code?: string;
  field?: string;
  value?: unknown;
};

export type ApiErrorResponse = {
  status: number;
  message: string;
  details?: ApiErrorDetail[];
  timestamp: string;
  path?: string;
};

export type ApiError = Error & {
  status?: number;
  code?: string;
  details?: ApiErrorDetail[];
};
