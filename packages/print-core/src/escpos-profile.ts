import type { TicketPrinterProfile } from "@parkflow/types";
import { DEFAULT_PRINTER_PROFILE, parsePrinterProfile } from "@parkflow/types";

/** Misma familia de comandos corte+estado que `apps/desktop/src-tauri/src/printer_profile.rs` (v1). */
export const TAURI_PRINTER_PRESET_BUNDLE = "gsV0-gsR1-v1" as const;

const CUT_FULL = new Uint8Array([0x1d, 0x56, 0x00]);
const STATUS_GS_R1 = new Uint8Array([0x1d, 0x72, 0x01]);

export type EscPosProfileResolved = {
  id: TicketPrinterProfile;
  cutBytes: Uint8Array;
  statusQueryBytes: Uint8Array;
  paperEndGsR1: (b: number) => boolean;
  paperNearEndGsR1: (b: number) => boolean;
  hardwareReadyAfterPrint: (status: number | null) => boolean;
  hasPaperHintGsR1: (b: number) => boolean | null;
  statusHintGsR1: (b: number) => string | null;
};

function paperEndGsR1(_profileId: TicketPrinterProfile, b: number): boolean {
  return (b & 0b0010_0000) !== 0;
}

function paperNearEndGsR1(_profileId: TicketPrinterProfile, b: number): boolean {
  return (b & 0b0000_1100) !== 0;
}

export function resolveEscPosProfile(raw: string | null | undefined): EscPosProfileResolved {
  const id = parsePrinterProfile(raw?.trim() || null) ?? DEFAULT_PRINTER_PROFILE;
  return {
    id,
    cutBytes: CUT_FULL,
    statusQueryBytes: STATUS_GS_R1,
    paperEndGsR1: (b) => paperEndGsR1(id, b),
    paperNearEndGsR1: (b) => paperNearEndGsR1(id, b),
    hardwareReadyAfterPrint: (status) => {
      if (status === null) {
        return false;
      }
      return !paperEndGsR1(id, status);
    },
    hasPaperHintGsR1: (b) => {
      if (paperEndGsR1(id, b)) {
        return false;
      }
      if (paperNearEndGsR1(id, b)) {
        return true;
      }
      return true;
    },
    statusHintGsR1: (b) => {
      if (paperEndGsR1(id, b)) {
        return "paper_end_detected";
      }
      if (paperNearEndGsR1(id, b)) {
        return "paper_near_end_detected";
      }
      return null;
    }
  };
}
