import { create } from "zustand";

type DialogType = "confirm" | "prompt";

export type AlertDialogStatus = "default" | "accent" | "success" | "warning" | "danger";

export interface DialogOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  status?: AlertDialogStatus;
}

export interface DialogState extends DialogOptions {
  type: DialogType;
  isOpen: boolean;
  resolve: (value: boolean | string | null) => void;
  inputValue: string;
}

interface DialogStore {
  dialog: DialogState;
  setDialog: (partial: Partial<DialogState>) => void;
  confirm: (message: string, options?: Omit<DialogOptions, "message">) => Promise<boolean>;
  prompt: (message: string, options?: Omit<DialogOptions, "message">) => Promise<string | null>;
  close: () => void;
  confirmAction: () => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  dialog: {
    type: "confirm",
    isOpen: false,
    message: "",
    resolve: () => {},
    inputValue: "",
  },
  setDialog: (partial) => set((state) => ({ dialog: { ...state.dialog, ...partial } })),
  confirm: (message, options) => {
    return new Promise<boolean>((resolve) => {
      set({
        dialog: {
          type: "confirm",
          isOpen: true,
          message,
          ...options,
          inputValue: "",
          resolve: (val) => resolve(val as boolean),
        },
      });
    });
  },
  prompt: (message, options) => {
    return new Promise<string | null>((resolve) => {
      set({
        dialog: {
          type: "prompt",
          isOpen: true,
          message,
          ...options,
          inputValue: options?.defaultValue ?? "",
          resolve: (val) => resolve(val as string | null),
        },
      });
    });
  },
  close: () => {
    const { dialog } = get();
    if (dialog.isOpen) {
      dialog.resolve(dialog.type === "confirm" ? false : null);
    }
    set({ dialog: { ...dialog, isOpen: false } });
  },
  confirmAction: () => {
    const { dialog } = get();
    if (dialog.isOpen) {
      dialog.resolve(dialog.type === "confirm" ? true : dialog.inputValue);
    }
    set({ dialog: { ...dialog, isOpen: false } });
  },
}));
