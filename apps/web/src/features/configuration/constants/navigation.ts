import {
  SlidersHorizontal,
  Building2,
  CreditCard,
  Printer,
  Clock,
  Wallet,
  Cog,
  Grid3x3,
  Tags,
  Users,
  Settings,
  LayoutTemplate,
  Wand2,
  Database,
  Handshake,
  Ticket,
  Mail,
  type LucideIcon,
} from "lucide-react";

export type ConfigNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  flag?: "agreements" | "prepaidPlans" | "lockers" | "cash";
};

export type ConfigNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: ConfigNavItem[];
};

export const CONFIG_NAVIGATION: ConfigNavGroup[] = [
  {
    id: "administracion",
    label: "Administración",
    icon: Settings,
    items: [
      { key: "general", label: "General", href: "/configuracion?section=setup", icon: SlidersHorizontal, description: "Configuración general del sistema" },
      { key: "users", label: "Usuarios", href: "/configuracion?section=users", icon: Users, description: "Administra los usuarios, roles y permisos" },
      { key: "parameters", label: "Parámetros", href: "/configuracion?section=parameters", icon: Settings, description: "Parámetros generales del sistema" },
      { key: "interface", label: "Interfaz", href: "/configuracion?section=interface", icon: LayoutTemplate, description: "Personalización de la interfaz" },
      { key: "masters", label: "Maestros", href: "/configuracion?section=masters", icon: Database, description: "Tipos de vehículo y maestros" },
      { key: "onboarding", label: "Asistente Inicial", href: "/configuracion?section=onboarding", icon: Wand2, description: "Ejecuta el asistente inicial" },
      { key: "comunicaciones", label: "Comunicaciones", href: "/configuracion/comunicaciones", icon: Mail, description: "Configuración de Email y SMS" },
    ],
  },
  {
    id: "organizacion",
    label: "Organización",
    icon: Building2,
    items: [
      { key: "sedes", label: "Sedes", href: "/configuracion/sedes", icon: Building2, description: "Administrar sedes del parqueadero" },
      { key: "cajas", label: "Cajas", href: "/configuracion/cajas", icon: CreditCard, description: "Puntos de caja y terminales", flag: "cash" },
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    icon: Cog,
    items: [
      { key: "operacion", label: "Operación", href: "/configuracion/operacion", icon: Cog, description: "Reglas y parámetros operativos" },
    ],
  },
  {
    id: "cobro",
    label: "Cobro",
    icon: Wallet,
    items: [
      { key: "metodos-pago", label: "Métodos de pago", href: "/configuracion/metodos-pago", icon: Wallet, description: "Medios de cobro aceptados" },
      { key: "fracciones", label: "Fracciones", href: "/configuracion/fracciones", icon: Clock, description: "Fracciones de tiempo y cobro" },
      { key: "agreements", label: "Convenios", href: "/configuracion?section=agreements", icon: Handshake, description: "Convenios empresariales", flag: "agreements" },
      { key: "prepaid", label: "Prepagados", href: "/configuracion?section=prepaid", icon: Ticket, description: "Paquetes prepagados", flag: "prepaidPlans" },
    ],
  },
  {
    id: "infraestructura",
    label: "Infraestructura",
    icon: Printer,
    items: [
      { key: "impresoras", label: "Impresoras", href: "/configuracion/impresoras", icon: Printer, description: "Dispositivos de impresión" },
    ],
  },
  {
    id: "estacionamiento",
    label: "Estacionamiento",
    icon: Grid3x3,
    items: [
      { key: "espacios", label: "Espacios", href: "/configuracion/espacios", icon: Grid3x3, description: "Distribución de espacios" },
      { key: "lockers", label: "Lockers", href: "/configuracion/lockers", icon: Tags, description: "Lockers numerados para cascos", flag: "lockers" },
    ],
  },
];
