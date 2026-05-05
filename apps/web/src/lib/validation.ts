import { z } from "zod";

/**
 * Reusable Zod helpers with human-friendly error messages in Spanish.
 */

export const requiredString = (message: string) => 
  z.string({ required_error: message, invalid_type_error: message })
   .min(1, { message });

export const emailSchema = (message: string = "Ingresa un correo electrónico válido.") =>
  z.string().email({ message });

export const phoneSchema = (message: string = "Ingresa un número de teléfono válido.") =>
  z.string().regex(/^\+?[0-9]{7,15}$/, { message });

export const plateSchema = (message: string = "Ingresa una placa válida (ej: AAA123 o AAA1234).") =>
  z.string()
   .toUpperCase()
   .regex(/^[A-Z0-9]{5,7}$/, { message });

export const positiveNumber = (message: string) =>
  z.number({ required_error: message, invalid_type_error: message })
   .positive({ message });

export const nonNegativeNumber = (message: string) =>
  z.number({ required_error: message, invalid_type_error: message })
   .min(0, { message });

/**
 * Example usage:
 * 
 * const companySchema = z.object({
 *   name: requiredString("Ingresa el nombre de la empresa."),
 *   nit: requiredString("Ingresa el NIT de la empresa."),
 *   status: z.enum(["ACTIVE", "INACTIVE"], {
 *     errorMap: () => ({ message: "Selecciona el estado de la empresa." })
 *   }),
 * });
 */
