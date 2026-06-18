import { apiFetch, cfgBase } from "./_shared";
import { buildApiHeaders } from "./_shared";

export interface FeatureConfig {
  companyId?: string;
  agreements: boolean;
  prepaid: boolean;
  memberships: boolean;
  electronicBilling: boolean;
  lockerControl: boolean;
  motorcycleParking: boolean;
  bicycleParking: boolean;
  multiplePaymentMethods: boolean;
  plateValidation: boolean;
  specialRates: boolean;
  frequentCustomers: boolean;
  helmetControl: boolean;
  accessoryControl: boolean;
  reservations: boolean;
  operation24Hours: boolean;
}

export interface FeatureItem {
  key: keyof FeatureConfig;
  label: string;
  description: string;
  tooltip: string;
  category: "operacion" | "facturacion" | "vehiculos" | "clientes" | "seguridad";
}

export const FEATURES_LIST: FeatureItem[] = [
  {
    key: "agreements",
    label: "Maneja Convenios",
    description: "Convenios con empresas y tarifas preferenciales",
    tooltip: "Activa o desactiva la gestión de convenios empresariales. Si se desactiva, se oculta el menú de convenios, formularios, reportes y configuraciones relacionadas.",
    category: "clientes",
  },
  {
    key: "prepaid",
    label: "Maneja Planes Prepagados",
    description: "Paquetes de horas prepagadas para clientes",
    tooltip: "Activa o desactiva los planes prepagados. Si se desactiva, se ocultan las opciones de prepagados en onboarding, menús, formularios y reportes.",
    category: "clientes",
  },
  {
    key: "memberships",
    label: "Maneja Membresías",
    description: "Membresías y contratos mensuales",
    tooltip: "Activa o desactiva membresías mensuales. Si se desactiva, se oculta la gestión de contratos mensuales y beneficios asociados.",
    category: "clientes",
  },
  {
    key: "electronicBilling",
    label: "Maneja Facturación Electrónica",
    description: "Facturación electrónica y comprobantes fiscales",
    tooltip: "Activa o desactiva la facturación electrónica. Si se desactiva, solo se generan tickets/tiquetes sin factura fiscal.",
    category: "facturacion",
  },
  {
    key: "lockerControl",
    label: "Maneja Control de Lockers",
    description: "Casilleros inteligentes para cascos y accesorios",
    tooltip: "Activa o desactiva el control de lockers. Si se desactiva, se oculta la gestión de lockers en configuración y operación.",
    category: "operacion",
  },
  {
    key: "motorcycleParking",
    label: "Maneja Parqueadero de Motos",
    description: "Estacionamiento para motocicletas",
    tooltip: "Activa o desactiva el parqueadero de motos. Si se desactiva, no se permiten ingresos de motos y se ocultan configuraciones relacionadas.",
    category: "vehiculos",
  },
  {
    key: "bicycleParking",
    label: "Maneja Parqueadero de Bicicletas",
    description: "Estacionamiento para bicicletas",
    tooltip: "Activa o desactiva el parqueadero de bicicletas. Si se desactiva, se ocultan opciones de ingreso y configuración de bicicletas.",
    category: "vehiculos",
  },
  {
    key: "multiplePaymentMethods",
    label: "Múltiples Métodos de Pago",
    description: "Aceptar varios métodos de pago",
    tooltip: "Activa o desactiva múltiples métodos de pago. Si se desactiva, solo se muestra el método principal configurado.",
    category: "facturacion",
  },
  {
    key: "plateValidation",
    label: "Validaciones de Placas",
    description: "Validación automática de placas vehiculares",
    tooltip: "Activa o desactiva la validación de placas. Si se desactiva, se permiten placas sin validación de formato.",
    category: "seguridad",
  },
  {
    key: "specialRates",
    label: "Tarifas Especiales",
    description: "Tarifas diferenciadas por tipo de vehículo, horario o evento",
    tooltip: "Activa o desactiva tarifas especiales. Si se desactiva, solo se usa la tarifa estándar.",
    category: "facturacion",
  },
  {
    key: "frequentCustomers",
    label: "Clientes Frecuentes",
    description: "Programa de clientes frecuentes con beneficios",
    tooltip: "Activa o desactiva el programa de clientes frecuentes. Si se desactiva, se ocultan opciones de fidelización.",
    category: "clientes",
  },
  {
    key: "helmetControl",
    label: "Control de Cascos",
    description: "Registro y control de cascos en ingreso de motos",
    tooltip: "Activa o desactiva el control de cascos. Si se desactiva, no se muestran campos de casco en ingreso de motos ni configuraciones de lockers asociadas.",
    category: "operacion",
  },
  {
    key: "accessoryControl",
    label: "Control de Accesorios",
    description: "Registro de accesorios al ingresar vehículos",
    tooltip: "Activa o desactiva el control de accesorios. Si se desactiva, se ocultan los campos de accesorios en los formularios de ingreso.",
    category: "operacion",
  },
  {
    key: "reservations",
    label: "Maneja Reservas",
    description: "Reservas anticipadas de espacios de estacionamiento",
    tooltip: "Activa o desactiva el módulo de reservas. Si se desactiva, se ocultan opciones de reserva en la interfaz.",
    category: "operacion",
  },
  {
    key: "operation24Hours",
    label: "Operación 24 Horas",
    description: "Operación continua sin cierre diario",
    tooltip: "Activa o desactiva la operación 24 horas. Si se desactiva, se aplican horarios de apertura y cierre.",
    category: "operacion",
  },
];

export const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  operacion: { label: "Operación", description: "Configuración operativa del parqueadero" },
  facturacion: { label: "Facturación y Cobro", description: "Métodos de cobro y facturación electrónica" },
  vehiculos: { label: "Tipos de Vehículo", description: "Tipos de vehículo habilitados en el parqueadero" },
  clientes: { label: "Clientes y Contratos", description: "Gestión de clientes, convenios y membresías" },
  seguridad: { label: "Seguridad y Validaciones", description: "Validaciones y controles de seguridad" },
};

export async function fetchFeatureConfiguration(): Promise<FeatureConfig> {
  const headers = await buildApiHeaders();
  return apiFetch<FeatureConfig>(`${cfgBase()}/features`, {
    headers: { ...headers, "X-Parkflow-Auth-Toast-Silent": "1" },
    cache: "no-store",
  });
}

export async function updateFeatureConfiguration(
  data: Partial<FeatureConfig>
): Promise<FeatureConfig> {
  const headers = await buildApiHeaders();
  return apiFetch<FeatureConfig>(`${cfgBase()}/features`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
}
