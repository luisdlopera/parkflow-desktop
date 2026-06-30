/**
 * Hook for handling and translating form errors from React Hook Form + Zod
 * Converts technical errors to user-friendly Spanish messages
 */

import { useMemo } from "react";
import { UseFormReturn, FieldValues, FieldPath } from "react-hook-form";

const FIELD_NAMES: Record<string, string> = {
  plate: "Placa",
  email: "Correo electrónico",
  password: "Contraseña",
  site: "Sede",
  lane: "Carril",
  booth: "Cabina",
  terminal: "Terminal",
  amount: "Monto",
  reason: "Motivo",
  name: "Nombre",
  type: "Tipo de vehículo",
};

function getFieldName(key: string): string {
  return FIELD_NAMES[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

interface UseFormErrorHandlingReturn<T extends FieldValues> {
  translatedErrors: Record<string, string>;
  hasErrors: boolean;
  getFieldError: (fieldName: FieldPath<T>) => string | undefined;
  clearError: (fieldName: FieldPath<T>) => void;
}

/**
 * Hook que intercepta y traduce errores de un formulario React Hook Form
 *
 * @param form - Instancia de useForm() de React Hook Form
 * @returns Objeto con errores traducidos y utilidades
 *
 * @example
 * const form = useForm<FormValues>({ resolver: zodResolver(schema) });
 * const { translatedErrors, hasErrors } = useFormErrorHandling(form);
 *
 * return (
 *   <>
 *     {translatedErrors.email && (
 *       <p className="text-red-600">{translatedErrors.email}</p>
 *     )}
 *   </>
 * );
 */
export function useFormErrorHandling<T extends FieldValues>(
  form: UseFormReturn<T>
): UseFormErrorHandlingReturn<T> {
  const formErrors = form.formState.errors;

  const translatedErrors = useMemo(() => {
    const translated: Record<string, string> = {};

    // Recorre cada campo que tiene error
    Object.entries(formErrors).forEach(([fieldName, fieldError]) => {
      if (fieldError && typeof (fieldError as any).message === 'string') {
        const friendlyFieldName = getFieldName(fieldName);
        translated[fieldName] = (fieldError as any).message as string;
      } else if (fieldError && (fieldError as any).root && typeof (fieldError as any).root.message === 'string') {
        // Para errores a nivel de formulario
        translated.form = (fieldError as any).root.message as string;
      }
    });

    return translated;
  }, [formErrors]);

  const hasErrors = Object.keys(translatedErrors).length > 0;

  const getFieldError = (fieldName: FieldPath<T>): string | undefined => {
    return translatedErrors[String(fieldName)];
  };

  const clearError = (fieldName: FieldPath<T>): void => {
    form.clearErrors(fieldName);
  };

  return {
    translatedErrors,
    hasErrors,
    getFieldError,
    clearError,
  };
}
