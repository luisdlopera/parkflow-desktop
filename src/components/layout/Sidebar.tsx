"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Nuevo ingreso", href: "/nuevo-ingreso" },
  { label: "Vehiculos activos", href: "/vehiculos-activos" },
  { label: "Salida y cobro", href: "/salida-cobro" },
  { label: "Caja", href: "/caja" },
  { label: "Configuracion", href: "/configuracion" }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen border-r border-slate-200/70 bg-white/60 px-6 py-8 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-brand-500 text-white grid place-content-center font-semibold">
          P
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Parkflow</p>
          <p className="text-lg font-semibold">Control</p>
        </div>
      </div>
      <nav className="mt-10 space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-brand-500 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-xs text-white/70">{active ? "ON" : ""}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
