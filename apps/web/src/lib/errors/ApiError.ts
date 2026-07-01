export class ApiError extends Error {
  public status?: number;
  public code?: string;
  public correlationId?: string;
  public details?: Record<string, unknown>;
  public payload?: Record<string, unknown>;

  constructor(message: string, params?: { 
    status?: number; 
    code?: string; 
    correlationId?: string; 
    details?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = params?.status;
    this.code = params?.code;
    this.correlationId = params?.correlationId;
    this.details = params?.details;
    this.payload = params?.payload;
    
    // Set prototype explicitly for correct instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
