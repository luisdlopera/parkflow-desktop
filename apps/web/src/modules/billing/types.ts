export type PaymentMethod =
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

export type CashClosureStatus = "OPEN" | "CLOSED";
