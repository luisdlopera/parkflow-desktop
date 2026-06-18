"use client";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  manualSchema,
  countSchema,
  openSchema,
  closeSchema,
  voidSchema,
  shiftSchema,
  type ManualFormValues,
  type CountFormValues,
  type OpenFormValues,
  type CloseFormValues,
  type VoidFormValues,
  type ShiftFormValues,
} from "@/lib/validation/cash-session.schema";

export function useCajaForms() {
  const manualForm = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: { manualType: "MANUAL_INCOME", manualMethod: "CASH", manualAmount: "", manualReason: "" },
  });
  const countForm = useForm<CountFormValues>({
    resolver: zodResolver(countSchema),
    defaultValues: { countCash: "", countCard: "", countTransfer: "", countOther: "", countNotes: "" },
  });
  const openForm = useForm<OpenFormValues>({
    resolver: zodResolver(openSchema),
    defaultValues: { openNotes: "" },
  });
  const closeForm = useForm<CloseFormValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: { closeNotes: "" },
  });
  const voidForm = useForm<VoidFormValues>({
    resolver: zodResolver(voidSchema),
    defaultValues: { voidReason: "" },
  });
  const shiftForm = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { nextOpenAmount: "0" },
  });

  const manualType = useWatch({ control: manualForm.control, name: "manualType" });
  const manualMethod = useWatch({ control: manualForm.control, name: "manualMethod" });
  const countCash = useWatch({ control: countForm.control, name: "countCash" });
  const countCard = useWatch({ control: countForm.control, name: "countCard" });
  const countTransfer = useWatch({ control: countForm.control, name: "countTransfer" });
  const countOther = useWatch({ control: countForm.control, name: "countOther" });
  const countNotes = useWatch({ control: countForm.control, name: "countNotes" });

  return {
    manualForm, countForm, openForm, closeForm, voidForm, shiftForm,
    manualType, manualMethod,
    countCash, countCard, countTransfer, countOther, countNotes,
  };
}
