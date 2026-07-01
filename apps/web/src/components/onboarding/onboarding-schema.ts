import { z } from "zod";

const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const REQUIRED_FIELD_MESSAGES: Record<string, string> = {
  vehicleTypes: "Selecciona al menos un tipo de vehículo.",
  billingModel: "Selecciona un modelo de cobro.",
  totalCapacity: "Ingresa la capacidad total del parqueadero.",
  countryCode: "Selecciona el país de operación.",
  paymentMethods: "Selecciona al menos un método de pago.",
};

function messageForIssue(issue: z.ZodIssue) {
  const path = issue.path.join(".");
  const fallback = path
    ? REQUIRED_FIELD_MESSAGES[path] ?? "Debes completar este campo para continuar."
    : "Debes completar los campos obligatorios para continuar.";

  if (issue.message === "Required" || issue.code === z.ZodIssueCode.invalid_type && "received" in issue && issue.received === "undefined") {
    return fallback;
  }

  return issue.message;
}

export const Step1Schema = z.object({
  vehicleTypes: z.array(z.string()).min(1, "Selecciona al menos un tipo de vehículo."),
  helmetHandling: z.string().optional(),
  helmetTokenCount: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.vehicleTypes.includes("MOTORCYCLE")) {
    if (data.helmetHandling !== "LOCKERS" && data.helmetHandling !== "NONE") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona una opción de custodia de cascos.", path: ["helmetHandling"] });
    }
    if (data.helmetHandling === "LOCKERS") {
      const count = data.helmetTokenCount;
      if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La cantidad de lockers debe ser mayor a 0.", path: ["helmetTokenCount"] });
      } else if (count > 9999) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La cantidad de lockers no puede superar 9999.", path: ["helmetTokenCount"] });
      }
    }
  }
});

export const getStep2Schema = (vehicleTypes: string[]) => z.object({
  totalCapacity: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = Number(val);
      return Number.isNaN(num) ? val : num;
    },
    z.number({ required_error: "La capacidad total debe ser mayor a 0.", invalid_type_error: "La capacidad total debe ser un número entero." })
      .int("La capacidad total debe ser un número entero.")
      .min(1, "La capacidad total debe ser mayor a 0.")
  ),
  controlSlots: z.coerce.boolean().optional(),
  capacityByType: z.record(z.any()).optional(),
  allowLowerCapacity: z.coerce.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.controlSlots) {
    const byType = data.capacityByType || {};
    const selectedTypes = vehicleTypes.length > 0 ? vehicleTypes : Object.keys(byType);
    let hasInvalidField = false;
    let sum = 0;

    for (const type of selectedTypes) {
      const val = byType[type];
      if (val === "" || val === undefined || val === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El cupo no puede estar vacío.",
          path: ["capacityByType", type]
        });
        hasInvalidField = true;
      } else {
        const num = Number(val);
        if (Number.isNaN(num)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Ingresa un número válido.",
            path: ["capacityByType", type]
          });
          hasInvalidField = true;
        } else if (!Number.isInteger(num)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El cupo debe ser un número entero.",
            path: ["capacityByType", type]
          });
          hasInvalidField = true;
        } else if (num < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe existir al menos 1 cupo por tipo de vehículo habilitado.",
            path: ["capacityByType", type]
          });
          hasInvalidField = true;
        } else {
          sum += num;
        }
      }
    }

    if (hasInvalidField) {
      return;
    }

    if (sum > data.totalCapacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La suma de capacidades por tipo (${sum}) supera la capacidad total (${data.totalCapacity}).`,
        path: ["capacityByType"]
      });
    } else if (sum < data.totalCapacity) {
      if (!data.allowLowerCapacity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La suma de capacidades por tipo (${sum}) es menor que la capacidad total (${data.totalCapacity}).`,
          path: ["allowLowerCapacity"]
        });
      }
    }

    if (vehicleTypes.length > 0) {
      const invalidTypes = Object.keys(byType).filter(t => t && !vehicleTypes.includes(t));
      if (invalidTypes.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La capacidad por tipo contiene tipos no configurados en paso 1: ${invalidTypes.join(", ")}.`,
          path: ["capacityByType"]
        });
      }
    }
  }
});

export const getStep3Schema = (vehicleTypes: string[]) => z.object({
  billingModel: z.string().min(1, "Selecciona un modelo de cobro."),
  baseValue: z.coerce.number().optional(),
  flatRate: z.coerce.number().optional(),
  
  hasNightRate: z.coerce.boolean().optional(),
  nightRate: z.coerce.number().optional(),
  nightStartTime: z.string().optional(),
  nightEndTime: z.string().optional(),
  
  hasFullDayRate: z.coerce.boolean().optional(),
  fullDayRate: z.coerce.number().optional(),
  
  hasWeekendRate: z.coerce.boolean().optional(),
  weekendRate: z.coerce.number().optional(),
  
  hasFractions: z.coerce.boolean().optional(),
  minFractionMinutes: z.coerce.number().optional(),
  fractionValue: z.coerce.number().optional(),
  
  hasCourtesy: z.coerce.boolean().optional(),
  graceMinutes: z.coerce.number().optional(),
  
  enableRateByType: z.coerce.boolean().optional(),
  ratesByType: z.record(z.any()).optional(),
}).superRefine((data, ctx) => {
  const model = data.billingModel;
  const parsePositiveNumber = (value: unknown) => {
    if (value === "" || value === undefined || value === null) return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  
  if (model === "HOURLY" || model === "MIXED" || model === "FRACTION") {
    if (typeof data.baseValue !== "number" || !Number.isFinite(data.baseValue) || data.baseValue <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La tarifa base debe ser mayor a 0.", path: ["baseValue"] });
    }
  }
  
  if (model === "FLAT" || model === "FULL_DAY") {
    if (typeof data.flatRate !== "number" || !Number.isFinite(data.flatRate) || data.flatRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La tarifa única/día completo debe ser mayor a 0.", path: ["flatRate"] });
    }
  }
  
  if (data.hasNightRate) {
    if (model === "FULL_DAY") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Un modelo de cobro 'Día Completo' no puede tener tarifa nocturna. Cambia el modelo de cobro.", path: ["hasNightRate"] });
    }
    if (typeof data.nightRate !== "number" || !Number.isFinite(data.nightRate) || data.nightRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La tarifa nocturna debe ser mayor a 0.", path: ["nightRate"] });
    }
    if (!data.nightStartTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresa la hora de inicio de la tarifa nocturna.", path: ["nightStartTime"] });
    } else if (!timePattern.test(data.nightStartTime)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Formato de hora inválido. Se esperaba HH:MM (ej: 22:00).", path: ["nightStartTime"] });
    }
    if (!data.nightEndTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresa la hora de fin de la tarifa nocturna.", path: ["nightEndTime"] });
    } else if (!timePattern.test(data.nightEndTime)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Formato de hora inválido. Se esperaba HH:MM (ej: 06:00).", path: ["nightEndTime"] });
    }
    if (data.nightStartTime && data.nightEndTime && data.nightStartTime === data.nightEndTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La hora de inicio y fin no pueden ser iguales.", path: ["nightEndTime"] });
    }
  }
  
  if (data.hasFullDayRate && model !== "FULL_DAY" && model !== "FLAT") {
    if (typeof data.fullDayRate !== "number" || !Number.isFinite(data.fullDayRate) || data.fullDayRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La tarifa de día completo debe ser mayor a 0.", path: ["fullDayRate"] });
    }
  }
  
  if (data.hasWeekendRate) {
    if (typeof data.weekendRate !== "number" || !Number.isFinite(data.weekendRate) || data.weekendRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La tarifa de fin de semana debe ser mayor a 0.", path: ["weekendRate"] });
    }
  }
  
  if (data.hasFractions) {
    if (typeof data.minFractionMinutes !== "number" || !Number.isFinite(data.minFractionMinutes) || data.minFractionMinutes <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Los minutos mínimos de fracción deben ser mayor a 0.", path: ["minFractionMinutes"] });
    }
    if (typeof data.fractionValue !== "number" || !Number.isFinite(data.fractionValue) || data.fractionValue <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El valor de la fracción debe ser mayor a 0.", path: ["fractionValue"] });
    }
  }
  
  if (data.hasCourtesy) {
    if (typeof data.graceMinutes !== "number" || !Number.isFinite(data.graceMinutes) || data.graceMinutes <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Los minutos de cortesía deben ser mayor a 0.", path: ["graceMinutes"] });
    }
  }
  
  if (data.enableRateByType && data.ratesByType && vehicleTypes.length > 0) {
    const rates = data.ratesByType;
    const invalidRateTypes = Object.keys(rates).filter(t => t && !vehicleTypes.includes(t));
    if (invalidRateTypes.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Las tarifas contienen tipos de vehículo no configurados en el paso 1: ${invalidRateTypes.join(", ")}.`, path: ["ratesByType"] });
    }

    for (const type of vehicleTypes) {
      const rawRate = rates[type];
      const parsedRate = parsePositiveNumber(rawRate);
      if (parsedRate === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresa una tarifa válida.",
          path: ["ratesByType", type],
        });
      } else if (parsedRate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La tarifa por vehículo debe ser mayor a 0.",
          path: ["ratesByType", type],
        });
      }
    }
  }
});

export const Step4Schema = z.object({
  countryCode: z.string().min(1, "Selecciona un país."),
});

export const Step5Schema = z.object({
  enabled: z.coerce.boolean().optional(),
  dayShiftStart: z.string().optional(),
  dayShiftEnd: z.string().optional(),
  nightShiftStart: z.string().optional(),
  nightShiftEnd: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.enabled) {
    const parseTime = (timeStr?: string) => {
      if (!timeStr) return null;
      if (!timePattern.test(timeStr)) return null;
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const dStart = parseTime(data.dayShiftStart);
    const dEnd = parseTime(data.dayShiftEnd);
    const nStart = parseTime(data.nightShiftStart);
    const nEnd = parseTime(data.nightShiftEnd);

    if (dStart === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hora de inicio diurna inválida.", path: ["dayShiftStart"] });
    if (dEnd === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hora de fin diurna inválida.", path: ["dayShiftEnd"] });
    if (nStart === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hora de inicio nocturna inválida.", path: ["nightShiftStart"] });
    if (nEnd === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hora de fin nocturna inválida.", path: ["nightShiftEnd"] });

    if (dStart !== null && dEnd !== null) {
      if (dStart >= dEnd) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La hora de fin debe ser posterior a la de inicio.", path: ["dayShiftEnd"] });
      }
    }

    if (nStart !== null && nEnd !== null) {
      // Night shift can wrap around midnight, so nStart > nEnd is valid (e.g. 18:00 to 06:00)
      if (nStart === nEnd) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La hora de inicio y fin no pueden ser iguales.", path: ["nightShiftEnd"] });
      }
    }

    // Check for overlap
    if (dStart !== null && dEnd !== null && nStart !== null && nEnd !== null) {
      // Day shift: [dStart, dEnd]
      // Night shift: [nStart, nEnd] (might wrap)
      
      const isNightWraps = nStart > nEnd;
      
      const isOverlapping = (start1: number, end1: number, start2: number, end2: number, wraps2: boolean) => {
        if (!wraps2) {
            return (start1 < end2 && end1 > start2);
        } else {
            // wraps2 means interval 2 is [start2, 24:00] U [00:00, end2]
            return (start1 < end2) || (end1 > start2);
        }
      };

      if (isOverlapping(dStart, dEnd, nStart, nEnd, isNightWraps)) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Los turnos diurno y nocturno no pueden solaparse.", path: ["dayShiftEnd"] });
      }
    }
  }
});

export const Step6Schema = z.object({
  paymentMethods: z.array(z.string()).min(1, "Selecciona al menos un método de pago."),
});

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path && !errors[path]) {
      errors[path] = messageForIssue(issue);
    }
  }
  return errors;
}
