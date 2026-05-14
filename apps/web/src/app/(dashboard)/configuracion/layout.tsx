"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchRuntimeConfig, shouldShowModule, type RuntimeConfig } from "@/lib/runtime-config";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchRuntimeConfig, shouldShowModule, type RuntimeConfig } from "@/lib/runtime-config";
import OfflineFeatureGate from "@/components/feedback/OfflineFeatureGate";

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

  const nav = useMemo(
    () =>
      NAV.filter((item) => {
        if (item.href === "/configuracion/sedes") {
          const sites = runtimeConfig?.sites;
          return Array.isArray(sites) ? sites.length > 1 : true;
        }
        if (item.href === "/configuracion/cajas") {
          return shouldShowModule(runtimeConfig, "cash", true);
        }
        return true;
      }),
    [runtimeConfig]
  );

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
