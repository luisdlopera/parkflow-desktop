import { z } from "zod";

export const manualSchema = z.object({
  manualType: z.string(),
  manualMethod: z.string(),
  manualAmount: z.string(),
  manualReason: z.string(),
});
export type ManualFormValues = z.infer<typeof manualSchema>;

export const countSchema = z.object({
  countCash: z.string(),
  countCard: z.string(),
  countTransfer: z.string(),
  countOther: z.string(),
  countNotes: z.string(),
});
export type CountFormValues = z.infer<typeof countSchema>;

export const openSchema = z.object({ openNotes: z.string() });
export type OpenFormValues = z.infer<typeof openSchema>;

export const closeSchema = z.object({ closeNotes: z.string() });
export type CloseFormValues = z.infer<typeof closeSchema>;

export const voidSchema = z.object({ voidReason: z.string() });
export type VoidFormValues = z.infer<typeof voidSchema>;

export const shiftSchema = z.object({ nextOpenAmount: z.string() });
export type ShiftFormValues = z.infer<typeof shiftSchema>;
