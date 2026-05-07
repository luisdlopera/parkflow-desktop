import { ErrorCode } from "./error-codes";

export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | string,
    public readonly message: string,
    public readonly path?: string,
    public readonly correlationId?: string,
    public readonly details?: ApiErrorDetail[] | Record<string, any>,
    public readonly developerMessage?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
