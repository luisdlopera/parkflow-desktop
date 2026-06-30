import { create } from "zustand";
import { createPricingConfiguration } from "../lib/adapters";
import type { PricingConfiguration } from "../lib/types";

interface PricingBuilderStore {
  draft: PricingConfiguration;
  setDraft: (draft: PricingConfiguration) => void;
  patchDraft: (patch: Partial<PricingConfiguration>) => void;
  resetDraft: (draft?: Partial<PricingConfiguration>) => void;
}

export const usePricingBuilderStore = create<PricingBuilderStore>((set) => ({
  draft: createPricingConfiguration(),
  setDraft: (draft) => set({ draft }),
  patchDraft: (patch) => set((state) => ({ draft: createPricingConfiguration({ ...state.draft, ...patch }) })),
  resetDraft: (draft) => set({ draft: createPricingConfiguration(draft) }),
}));
