/**
 * Cash register domain types.
 */

export type CashSession = {
  id: string;
  cashRegisterId: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  status: "open" | "closed" | "abandoned";
};

export type CashMovement = {
  id: string;
  sessionId: string;
  type: "entry" | "exit" | "adjustment" | "void";
  amount: number;
  reason?: string;
  createdAt: string;
};

export type CashPolicy = {
  enableCash: boolean;
  enableMultiplePayments: boolean;
  minChange: number;
  maxChange: number;
};
