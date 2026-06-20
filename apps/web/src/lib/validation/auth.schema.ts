import { z } from "zod";
import { requiredString, emailSchema } from "@/lib/validation";

/**
 * Login form validation schema
 * Used for both login and initial setup flows
 */

export const loginSchema = z.object({
  email: emailSchema("El correo electrónico es inválido o está vacío."),
  password: requiredString("Debes ingresar la contraseña").min(1, "Debes ingresar la contraseña"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Setup/Initial configuration schema
 * Used when new admin creates account during initial setup
 */

export const setupSchema = z
  .object({
    email: emailSchema("El correo electrónico es inválido."),
    password: requiredString("La contraseña es requerida").min(8, "Mínimo 8 caracteres"),
    confirmPassword: requiredString("Debes confirmar la contraseña"),
    adminName: requiredString("El nombre del administrador es requerido"),
    companyName: requiredString("El nombre del negocio es requerido"),
    companyNit: requiredString("El NIT o identificación tributaria es requerido"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type SetupInput = z.infer<typeof setupSchema>;
