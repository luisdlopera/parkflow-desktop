import { z, type ZodTypeAny } from "zod";

export class ClientValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string>
  ) {
    super(message);
    this.name = "ClientValidationError";
  }
}

export function validatePayloadOrThrow<TSchema extends ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  fallbackMessage = "Revisa los campos requeridos"
): z.infer<TSchema> {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".") || "root";
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }

  const first = Object.values(fieldErrors)[0] ?? fallbackMessage;
  throw new ClientValidationError(first, fieldErrors);
}

export function toUserMessageFromClientValidation(error: unknown): string | null {
  if (!(error instanceof ClientValidationError)) {
    return null;
  }
  const first = Object.entries(error.fieldErrors)[0];
  if (!first) {
    return error.message;
  }
  return `${first[0]}: ${first[1]}`;
}

