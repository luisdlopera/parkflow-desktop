export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public status?: number;
  public code?: string;
  public path?: string;
  public correlationId?: string;
  public details?: unknown;
  public payload?: Record<string, unknown>;
  public developerMessage?: string;

  constructor(
    messageOrStatus: string | number,
    codeOrParams?: string | {
      status?: number;
      code?: string;
      path?: string;
      correlationId?: string;
      details?: unknown;
      payload?: Record<string, unknown>;
      developerMessage?: string;
    },
    message?: string,
    path?: string,
    correlationId?: string,
    details?: unknown,
    developerMessage?: string,
  ) {
    if (typeof messageOrStatus === "number") {
      super(message ?? "");
      this.status = messageOrStatus;
      this.code = typeof codeOrParams === "string" ? codeOrParams : undefined;
      this.path = path;
      this.correlationId = correlationId;
      this.details = details;
      this.developerMessage = developerMessage;
    } else {
      super(messageOrStatus);
      const params = typeof codeOrParams === "object" && codeOrParams !== null ? codeOrParams : undefined;
      this.status = params?.status;
      this.code = params?.code;
      this.path = params?.path;
      this.correlationId = params?.correlationId;
      this.details = params?.details;
      this.payload = params?.payload;
      this.developerMessage = params?.developerMessage;
    }

    this.name = "ApiError";

    // Set prototype explicitly for correct instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
