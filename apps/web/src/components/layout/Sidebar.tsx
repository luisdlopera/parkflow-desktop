"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParkingShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

const navItems = [
  { label: "Dashboard", href: "/", shortcut: "" },
  { label: "Nuevo ingreso", href: "/nuevo-ingreso", shortcut: "F1" },
  { label: "Vehiculos activos", href: "/vehiculos-activos", shortcut: "F3" },
  { label: "Salida y cobro", href: "/salida-cobro", shortcut: "F2" },
  { label: "Caja", href: "/caja", shortcut: "F4" },
  { label: "Configuracion", href: "/configuracion", shortcut: "" }
];

export default function Sidebar() {
  const pathname = usePathname();
  
  // Enable keyboard shortcuts
  useParkingShortcuts();

  return (
    <aside className="h-screen border-r border-slate-200/70 bg-white/60 px-4 py-6 backdrop-blur flex flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="h-12 w-12 rounded-2xl bg-brand-500 text-white grid place-content-center font-bold text-xl shadow-lg shadow-brand-500/30">
          P
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parkflow</p>
          <p className="text-lg font-bold text-slate-900">Desktop</p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-6 px-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Sistema operativo
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-all
                ${active
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
              `}
            >
              <span>{item.label}</span>
              <div className="flex items-center gap-2">
                {item.shortcut && (
                  <kbd className={`
                    hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded
                    ${active 
                      ? "bg-white/20 text-white" 
                      : "bg-slate-200 text-slate-500"}
                  `}>
                    {item.shortcut}
                  </kbd>
                )}
                {active && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Help tip */}
      <div className="mt-auto pt-6 px-2">
        <div className="rounded-xl bg-slate-100/80 p-3 text-xs text-slate-600">
          <p className="font-semibold mb-1">Atajos de teclado:</p>
          <div className="space-y-1 text-slate-500">
            <p><kbd className="font-mono bg-white px-1 rounded">F1</kbd> Nuevo ingreso</p>
            <p><kbd className="font-mono bg-white px-1 rounded">F2</kbd> Salida/cobro</p>
            <p><kbd className="font-mono bg-white px-1 rounded">F3</kbd> Vehículos</p>
            <p><kbd className="font-mono bg-white px-1 rounded">F4</kbd> Caja</p>
            <p><kbd className="font-mono bg-white px-1 rounded">Esc</kbd> Dashboard</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
