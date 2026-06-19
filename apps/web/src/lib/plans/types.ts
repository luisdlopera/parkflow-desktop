export interface PlanFeatures {
  clients: boolean;
  contracts: boolean;
  memberships: boolean;
  reports: boolean;
  appointments: boolean;
  attendanceControl: boolean;
  integrations: boolean;
  apiAccess: boolean;
  mobileAppAccess: boolean;
  billing: boolean;
  customBranding: boolean;
}

export type PlanFeatureKey = keyof PlanFeatures;

export interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  features: PlanFeatures;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  features: PlanFeatures;
}

export interface UpdatePlanRequest {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  features: PlanFeatures;
}

export const FEATURE_CATEGORIES: Record<string, { key: PlanFeatureKey; label: string }[]> = {
  gestion: [
    { key: "clients", label: "Clientes" },
    { key: "contracts", label: "Contratos" },
    { key: "memberships", label: "Membresías" },
  ],
  operacion: [
    { key: "reports", label: "Reportes" },
    { key: "appointments", label: "Agenda / Citas" },
    { key: "attendanceControl", label: "Control de asistencia" },
  ],
  tecnologia: [
    { key: "integrations", label: "Integraciones" },
    { key: "apiAccess", label: "Acceso API" },
    { key: "mobileAppAccess", label: "App móvil" },
  ],
  negocio: [
    { key: "billing", label: "Facturación" },
    { key: "customBranding", label: "Branding personalizado" },
  ],
};

export const FEATURE_CATEGORY_LABELS: Record<string, string> = {
  gestion: "Gestión",
  operacion: "Operación",
  tecnologia: "Tecnología",
  negocio: "Negocio",
};

export const DEFAULT_FEATURES: PlanFeatures = {
  clients: false,
  contracts: false,
  memberships: false,
  reports: false,
  appointments: false,
  attendanceControl: false,
  integrations: false,
  apiAccess: false,
  mobileAppAccess: false,
  billing: false,
  customBranding: false,
};
