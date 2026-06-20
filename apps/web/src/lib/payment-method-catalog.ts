export type PaymentMethodCode =
  | "CASH"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "CARD"
  | "QR"
  | "NEQUI"
  | "DAVIPLATA"
  | "TRANSFER"
  | "AGREEMENT"
  | "INTERNAL_CREDIT"
  | "OTHER"
  | "MIXED";

export type PaymentMethodEntry = {
  code: PaymentMethodCode;
  label: string;
  hint: string;
  tone: string;
  requiresReference: boolean;
  availableInOnboarding: boolean;
};

export const PAYMENT_METHOD_CATALOG: PaymentMethodEntry[] = [
  { code: "CASH",           label: "Efectivo",        hint: "Cambio / vuelto",     tone: "bg-emerald-500 hover:bg-emerald-600 border border-default-200", requiresReference: false, availableInOnboarding: true  },
  { code: "DEBIT_CARD",     label: "Tarjeta débito",  hint: "Datáfono débito",     tone: "bg-sky-500 hover:bg-sky-600 border border-default-200",         requiresReference: false, availableInOnboarding: true  },
  { code: "CREDIT_CARD",    label: "Tarjeta crédito", hint: "Datáfono crédito",    tone: "bg-indigo-500 hover:bg-indigo-600 border border-default-200",   requiresReference: false, availableInOnboarding: true  },
  { code: "QR",             label: "QR",              hint: "Código QR",           tone: "bg-slate-700 hover:bg-slate-800 border border-default-200",     requiresReference: false, availableInOnboarding: true  },
  { code: "NEQUI",          label: "Nequi",           hint: "Referencia requerida",tone: "bg-fuchsia-500 hover:bg-fuchsia-600 border border-default-200", requiresReference: true,  availableInOnboarding: true  },
  { code: "DAVIPLATA",      label: "Daviplata",       hint: "Referencia requerida",tone: "bg-rose-500 hover:bg-rose-600 border border-default-200",       requiresReference: true,  availableInOnboarding: true  },
  { code: "TRANSFER",       label: "Transferencia",   hint: "Banco / referencia",  tone: "bg-cyan-600 hover:bg-cyan-700 border border-default-200",       requiresReference: true,  availableInOnboarding: true  },
  { code: "AGREEMENT",      label: "Convenio",        hint: "Empresa aliada",      tone: "bg-amber-500 hover:bg-amber-600 border border-default-200",     requiresReference: false, availableInOnboarding: true  },
  { code: "INTERNAL_CREDIT",label: "Crédito interno", hint: "Cartera interna",     tone: "bg-violet-500 hover:bg-violet-600 border border-default-200",   requiresReference: false, availableInOnboarding: false },
  { code: "OTHER",          label: "Otro",            hint: "Caso especial",       tone: "bg-slate-600 hover:bg-slate-700 border border-default-200",     requiresReference: false, availableInOnboarding: false },
  { code: "MIXED",          label: "Mixto",           hint: "Pago dividido",       tone: "bg-teal-600 hover:bg-teal-700 border border-default-200",       requiresReference: false, availableInOnboarding: true  },
];

export const PAYMENT_OPTIONS_FOR_ONBOARDING = PAYMENT_METHOD_CATALOG.filter(
  (m) => m.availableInOnboarding
);
