export enum PrinterProfile {
  EpsonTmT20Iii = "epson_tm_t20iii",
  Xprinter80GenericEscPos = "xprinter_80_generic_esc_pos",
  BixolonSrp330Iii = "bixolon_srp330iii",
  BixolonSrp332Ii = "bixolon_srp332ii",
  Generic58mmEscPos = "generic_58mm_esc_pos"
}

export type TicketPrinterProfile = `${PrinterProfile}`;

export const DEFAULT_PRINTER_PROFILE: TicketPrinterProfile = PrinterProfile.Generic58mmEscPos;

export const PRINTER_PROFILE_VALUES = [
  PrinterProfile.EpsonTmT20Iii,
  PrinterProfile.Xprinter80GenericEscPos,
  PrinterProfile.BixolonSrp330Iii,
  PrinterProfile.BixolonSrp332Ii,
  PrinterProfile.Generic58mmEscPos
] as const satisfies readonly TicketPrinterProfile[];

const CANONICAL_SET: ReadonlySet<string> = new Set(PRINTER_PROFILE_VALUES);

export const PRINTER_PROFILE_ALIASES: Readonly<Record<string, TicketPrinterProfile>> = {
  [PrinterProfile.EpsonTmT20Iii]: PrinterProfile.EpsonTmT20Iii,
  [PrinterProfile.Xprinter80GenericEscPos]: PrinterProfile.Xprinter80GenericEscPos,
  [PrinterProfile.BixolonSrp330Iii]: PrinterProfile.BixolonSrp330Iii,
  [PrinterProfile.BixolonSrp332Ii]: PrinterProfile.BixolonSrp332Ii,
  [PrinterProfile.Generic58mmEscPos]: PrinterProfile.Generic58mmEscPos,
  "epson-tm-t20iii": PrinterProfile.EpsonTmT20Iii,
  "xprinter-80-generic": PrinterProfile.Xprinter80GenericEscPos,
  "bixolon-srp-330iii": PrinterProfile.BixolonSrp330Iii,
  "bixolon-srp-332ii": PrinterProfile.BixolonSrp332Ii,
  "generic-58mm": PrinterProfile.Generic58mmEscPos
};

export function isTicketPrinterProfile(value: unknown): value is TicketPrinterProfile {
  return typeof value === "string" && CANONICAL_SET.has(value);
}

export function parsePrinterProfile(raw: string | null | undefined): TicketPrinterProfile | null {
  if (raw == null) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return PRINTER_PROFILE_ALIASES[normalized] ?? null;
}

export function resolvePrinterProfile(
  raw: string | null | undefined,
  options?: { strict?: boolean }
): TicketPrinterProfile {
  const parsed = parsePrinterProfile(raw);
  if (parsed) {
    return parsed;
  }

  if (options?.strict) {
    throw new Error(`Unknown printer profile: ${raw ?? "<empty>"}`);
  }

  return DEFAULT_PRINTER_PROFILE;
}
