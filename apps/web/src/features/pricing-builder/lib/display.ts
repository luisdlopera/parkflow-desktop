import type { PricingRoundingMode } from "./types";

export const VEHICLE_LABELS: Record<string, string> = {
  CAR: "Carro",
  AUTO: "Carro",
  AUTOMOBILE: "Carro",
  MOTORCYCLE: "Moto",
  MOTO: "Moto",
  BICYCLE: "Bicicleta",
  BIKE: "Bicicleta",
  TRUCK: "Camión",
  BUS: "Bus",
  VAN: "Van",
  ELECTRIC: "Eléctrico",
  OTHER: "Otro",
};

export const ROUNDING_LABELS: Record<PricingRoundingMode, string> = {
  NONE: "Sin redondeo",
  UP: "Hacia arriba",
  DOWN: "Hacia abajo",
  NEAREST: "Al más cercano",
};

export const ROUNDING_HELP: Record<PricingRoundingMode, string> = {
  NONE: "Cobra exactamente los minutos calculados.",
  UP: "Sube al siguiente bloque. Ejemplo: 61 min con bloques de 15 se cobra como 75 min.",
  DOWN: "Baja al bloque anterior. Ejemplo: 74 min con bloques de 15 se cobra como 60 min.",
  NEAREST: "Usa el bloque más cercano. Ejemplo: 68 min con bloques de 15 se cobra como 75 min.",
};

export function labelVehicle(value: string) {
  return VEHICLE_LABELS[value] ?? value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
