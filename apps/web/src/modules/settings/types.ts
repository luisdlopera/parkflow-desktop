export type ParkingSiteRow = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  managerName: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethodRow = {
  id: string;
  code: string;
  name: string;
  requiresReference: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PrinterRow = {
  id: string;
  siteId: string;
  name: string;
  type: "THERMAL" | "PDF" | "OS";
  connection: "USB" | "NET" | "BLUETOOTH" | "LOCAL_AGENT";
  paperWidthMm: number;
  endpointOrDevice: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OperationalParameterRow = {
  id: string;
  siteId: string;
  allowEntryWithoutPrinter: boolean;
  allowExitWithoutPayment: boolean;
  allowReprint: boolean;
  allowVoid: boolean;
  requirePhotoEntry: boolean;
  requirePhotoExit: boolean;
  toleranceMinutes: number;
  maxTimeNoCharge: number;
  legalMessage: string | null;
  offlineModeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RateFractionRow = {
  id: string;
  rateId: string;
  fromMinute: number;
  toMinute: number;
  value: number;
  roundUp: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CashRegisterRow = {
  id: string;
  site: string;
  siteId: string | null;
  code: string;
  name: string | null;
  terminal: string;
  label: string | null;
  printerId: string | null;
  printerName: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VehicleTypeRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  requiresPlate: boolean;
  requiresPhoto: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};
