"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchRuntimeConfig, shouldShowModule, type RuntimeConfig } from "@/lib/runtime-config";

const NAV_GROUPS = [
  {
    label: "Administración",
    items: [{ href: "/configuracion", label: "General" }]
  },
  {
    label: "Organización",
    items: [
      { href: "/configuracion/sedes", label: "Sedes" },
      { href: "/configuracion/cajas", label: "Cajas" }
    ]
  },
  {
    label: "Operación",
    items: [{ href: "/configuracion/operacion", label: "Operación" }]
  },
  {
    label: "Cobro",
    items: [
      { href: "/configuracion/metodos-pago", label: "Métodos de pago" },
      { href: "/configuracion/fracciones", label: "Fracciones" }
    ]
  },
  {
    label: "Infraestructura",
    items: [{ href: "/configuracion/impresoras", label: "Impresoras" }]
  }
];

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  const navGroups = useMemo(() => {
    const isVisible = (href: string) => {
      if (href === "/configuracion/sedes") {
        const sites = runtimeConfig?.sites;
        return Array.isArray(sites) ? sites.length > 1 : true;
      }
      if (href === "/configuracion/cajas") {
        return shouldShowModule(runtimeConfig, "cash", true);
      }
      return true;
    };

    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => isVisible(item.href))
    })).filter((group) => group.items.length > 0);
  }, [runtimeConfig]);

  return (
    <div className="space-y-4">
      <nav className="space-y-3 border-b border-slate-200 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {children}
    </div>
  );
}
