import { PARKFLOW_VALIDATION_CONTRACTS } from "@parkflow/types";

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates a payload object against a shared monorepo contract.
 */
export function validateContract(
  contractKey: keyof typeof PARKFLOW_VALIDATION_CONTRACTS,
  payload: any
): ValidationResult {
  const contract = PARKFLOW_VALIDATION_CONTRACTS[contractKey];
  if (!contract) {
    throw new Error(`Validation contract '${contractKey}' not found.`);
  }

  const issues: ValidationIssue[] = [];

  for (const [fieldName, fieldContract] of Object.entries(contract.fields)) {
    const value = payload?.[fieldName];

    // Check if missing
    const isMissing = value === undefined || value === null;

    if (isMissing) {
      if (fieldContract.optional || fieldContract.nullable) {
        continue;
      }
      // Check if there's a required rule
      const hasRequired = fieldContract.rules.some((r) => r.type === "required");
      if (hasRequired) {
        issues.push({
          field: fieldName,
          message: "El campo es requerido.",
        });
      }
      continue;
    }

    // Check rules
    for (const rule of fieldContract.rules) {
      if (rule.type === "required") {
        if (value === "") {
          issues.push({
            field: fieldName,
            message: "El campo no puede estar vacío.",
          });
        }
      } else if (rule.type === "string") {
        if (typeof value !== "string") {
          issues.push({
            field: fieldName,
            message: "El campo debe ser una cadena de texto.",
          });
          continue;
        }
        if (rule.min !== undefined && value.length < rule.min) {
          issues.push({
            field: fieldName,
            message: `El campo debe tener al menos ${rule.min} caracteres.`,
          });
        }
        if (rule.max !== undefined && value.length > rule.max) {
          issues.push({
            field: fieldName,
            message: `El campo no puede tener más de ${rule.max} caracteres.`,
          });
        }
        if (rule.pattern !== undefined) {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(value)) {
            issues.push({
              field: fieldName,
              message: "El formato del campo no es válido.",
            });
          }
        }
      } else if (rule.type === "uuid") {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof value !== "string" || !uuidRegex.test(value)) {
          issues.push({
            field: fieldName,
            message: "El campo debe ser un UUID válido.",
          });
        }
      } else if (rule.type === "number") {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          issues.push({
            field: fieldName,
            message: "El campo debe ser un número válido.",
          });
          continue;
        }
        if (rule.min !== undefined && numValue < rule.min) {
          issues.push({
            field: fieldName,
            message: `El valor mínimo permitido es ${rule.min}.`,
          });
        }
        if (rule.max !== undefined && numValue > rule.max) {
          issues.push({
            field: fieldName,
            message: `El valor máximo permitido es ${rule.max}.`,
          });
        }
      } else if (rule.type === "enum") {
        if (!rule.values.includes(value)) {
          issues.push({
            field: fieldName,
            message: "El valor seleccionado no es válido.",
          });
        }
      }
    }
  }

  return {
    success: issues.length === 0,
    issues,
  };
}
