export interface PlateValidationRule {
  countryCode: string;
  vehicleType: string;
  pattern: RegExp;
  example: string;
  errorMessage: string;
  enabled: boolean;
}

export const plateRules: PlateValidationRule[] = [
  { countryCode: "CO", vehicleType: "CAR", pattern: /^[A-Z]{3}[0-9]{3}$/, example: "ABC123", errorMessage: "Para carro en Colombia se esperan 3 letras y 3 números", enabled: true },
  { countryCode: "CO", vehicleType: "VAN", pattern: /^[A-Z]{3}[0-9]{3}$/, example: "ABC123", errorMessage: "Para van en Colombia se esperan 3 letras y 3 números", enabled: true },
  { countryCode: "CO", vehicleType: "TRUCK", pattern: /^[A-Z]{3}[0-9]{3}$/, example: "ABC123", errorMessage: "Para camión en Colombia se esperan 3 letras y 3 números", enabled: true },
  { countryCode: "CO", vehicleType: "BUS", pattern: /^[A-Z]{3}[0-9]{3}$/, example: "ABC123", errorMessage: "Para bus en Colombia se esperan 3 letras y 3 números", enabled: true },
  { countryCode: "CO", vehicleType: "ELECTRIC", pattern: /^[A-Z]{3}[0-9]{3}$/, example: "ABC123", errorMessage: "Para eléctrico en Colombia se esperan 3 letras y 3 números", enabled: true },
  { countryCode: "CO", vehicleType: "BICYCLE", pattern: /^[A-Z0-9]{3,12}$/, example: "BICI001", errorMessage: "Para bicicleta use un identificador de 3 a 12 letras o números", enabled: true },
  { countryCode: "CO", vehicleType: "OTHER", pattern: /^[A-Z]{3}[0-9]{3}$/, example: "ABC123", errorMessage: "Para vehículo general en Colombia se esperan 3 letras y 3 números", enabled: true },
  { countryCode: "CO", vehicleType: "MOTORCYCLE", pattern: /^[A-Z]{3}[0-9]{2}[A-Z]{1}$/, example: "ABC12A", errorMessage: "Para moto en Colombia se esperan 3 letras, 2 números y 1 letra", enabled: true }
];

export function normalizePlate(plate: string): string {
  if (!plate) return "";
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export interface PlateValidationResult {
  isValid: boolean;
  normalizedPlate: string;
  errorMessage?: string;
}

const translateVehicleType = (type: string) => {
  switch (type.toUpperCase()) {
    case 'CAR': return 'carro';
    case 'MOTORCYCLE': return 'moto';
    case 'VAN': return 'van';
    case 'TRUCK': return 'camión';
    case 'BUS': return 'bus';
    case 'BICYCLE': return 'bicicleta';
    case 'ELECTRIC': return 'eléctrico';
    default: return 'otro vehículo';
  }
};

export function validatePlate(countryCode: string | undefined | null, vehicleType: string, plate: string): PlateValidationResult {
  const normalized = normalizePlate(plate);
  
  if (!normalized) {
    return { isValid: false, normalizedPlate: normalized, errorMessage: "La placa no puede estar vacía o contener solo símbolos" };
  }

  const targetCountry = countryCode || "CO";
  const targetType = vehicleType || "OTHER";

  const activeRule = plateRules.find(r => r.enabled && r.countryCode.toUpperCase() === targetCountry && r.vehicleType.toUpperCase() === targetType);

  if (!activeRule) {
    const isCountrySupported = plateRules.some(r => r.countryCode.toUpperCase() === targetCountry);
    if (isCountrySupported) {
      return { isValid: false, normalizedPlate: normalized, errorMessage: `Tipo de vehículo no soportado para validación en ${targetCountry}` };
    }
    return { isValid: false, normalizedPlate: normalized, errorMessage: `Pais no soportado para validación de placa: ${targetCountry}` };
  }

  if (activeRule.pattern.test(normalized)) {
    return { isValid: true, normalizedPlate: normalized };
  }

  // Buscar todas las reglas que coincidan cruzadas y seleccionar la más "específica".
  // Esto evita que reglas muy permisivas (ej: BICYCLE) ganen sobre reglas más concretas (ej: MOTORCYCLE).
  const crossMatches = plateRules.filter(r => r.enabled && r.countryCode.toUpperCase() === targetCountry && r.vehicleType.toUpperCase() !== targetType && r.pattern.test(normalized));

  let errorMessage = `${activeRule.errorMessage} (Ej: ${activeRule.example}).`;
  if (crossMatches.length > 0) {
    // Heurística simple de especificidad: longitud de la fuente del regex. Patrones más largos suelen ser más específicos.
    crossMatches.sort((a, b) => b.pattern.source.length - a.pattern.source.length);
    const best = crossMatches[0];
    errorMessage += ` Parece que ingresaste una placa de ${translateVehicleType(best.vehicleType)}.`;
  }

  return { isValid: false, normalizedPlate: normalized, errorMessage };
}
