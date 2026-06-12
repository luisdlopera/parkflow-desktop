"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchRuntimeConfig, shouldShowModule, type RuntimeConfig } from "@/lib/runtime-config";
import {
  SlidersHorizontal,
  Building2,
  CreditCard,
  Printer,
  Clock,
  Wallet,
  Cog,
  Grid3x3,
  type LucideIcon,
} from "lucide-react";

type GridItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

const GRID_GROUPS: { label: string; items: GridItem[] }[] = [
  {
    label: "Administración",
    items: [
      { href: "/configuracion", label: "General", icon: SlidersHorizontal, description: "Configuración general del sistema" },
    ],
  },
  {
    label: "Organización",
    items: [
      { href: "/configuracion/sedes", label: "Sedes", icon: Building2, description: "Administrar sedes del parqueadero" },
      { href: "/configuracion/cajas", label: "Cajas", icon: CreditCard, description: "Puntos de caja y terminales" },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/configuracion/operacion", label: "Operación", icon: Cog, description: "Reglas y parámetros operativos" },
    ],
  },
  {
    label: "Cobro",
    items: [
      { href: "/configuracion/metodos-pago", label: "Métodos de pago", icon: Wallet, description: "Medios de cobro aceptados" },
      { href: "/configuracion/fracciones", label: "Fracciones", icon: Clock, description: "Fracciones de tiempo y cobro" },
    ],
  },
  {
    label: "Infraestructura",
    items: [
      { href: "/configuracion/impresoras", label: "Impresoras", icon: Printer, description: "Dispositivos de impresión" },
    ],
  },
  {
    label: "Estacionamiento",
    items: [
      { href: "/configuracion/espacios", label: "Espacios", icon: Grid3x3, description: "Distribución de espacios" },
    ],
  },
];

export default function ConfigSidebar() {
  const pathname = usePathname();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  const filteredGridGroups = useMemo(
    () =>
      GRID_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.href === "/configuracion/cajas") {
            return shouldShowModule(runtimeConfig, "cash", true);
          }
          return true;
        }),
      })).filter((group) => group.items.length > 0),
    [runtimeConfig]
  );

  return (
    <div className="space-y-6">
      {filteredGridGroups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {group.label}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
                    isActive
                      ? "border-orange-200 bg-orange-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isActive ? "text-orange-900" : "text-slate-900"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
