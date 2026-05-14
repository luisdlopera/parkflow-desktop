"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParkingShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useState, useEffect } from "react";
import { fetchRuntimeConfig, shouldShowModule, type RuntimeConfig } from "@/lib/runtime-config";

const navItems = [
  { label: "Dashboard", href: "/", shortcut: "", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Nuevo ingreso", href: "/nuevo-ingreso", shortcut: "F1", icon: "M12 4v16m8-8H4" },
  { label: "Vehiculos activos", href: "/vehiculos-activos", shortcut: "F3", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { label: "Salida y cobro", href: "/salida-cobro", shortcut: "F2", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Caja", href: "/caja", shortcut: "F4", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { label: "Configuracion", href: "/configuracion", shortcut: "", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface UISettings {
  showSystemStatus: boolean;
  showKeyboardShortcuts: boolean;
}

function readUiSettings(): UISettings | null {
  const saved = localStorage.getItem("parkflow_ui_settings");
  if (!saved) {
    return null;
  }
  try {
    return JSON.parse(saved) as UISettings;
  } catch {
    localStorage.removeItem("parkflow_ui_settings");
    return null;
  }
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  useParkingShortcuts();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);

  const [uiSettings, setUiSettings] = useState<UISettings>({
    showSystemStatus: true,
    showKeyboardShortcuts: true
  });

  useEffect(() => {
    const saved = readUiSettings();
    if (saved) {
      setUiSettings(saved);
    }
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  const visibleItems = navItems.filter((item) => {
    if (item.href === "/caja") return shouldShowModule(runtimeConfig, "cash", true);
    if (item.href === "/configuracion") return true;
    if (item.href === "/salida-cobro") return true;
    return true;
  });

  // Escuchar cambios en localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = readUiSettings();
      if (saved) {
        setUiSettings(saved);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <aside data-testid="desktop-sidebar" className={`
      hidden md:flex sticky top-0 z-20 h-screen border-r border-slate-200/70 bg-white/60 dark:bg-neutral-950/50 dark:border-neutral-800/70 backdrop-blur
      flex-col transition-all duration-300 ease-in-out
      ${collapsed ? "w-[72px] px-2" : "w-[260px] px-4"}
    `}>
      {/* Logo section con botón de toggle integrado */}
      <div className={`
        flex items-center gap-3 px-2 transition-all duration-300
        ${collapsed ? "py-6 justify-center" : "py-6"}
      `}>
        <div className={`
          rounded-2xl bg-orange-500 text-white grid place-content-center font-bold shadow-lg shadow-orange-500/30
          ${collapsed ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl"}
        `}>
          P
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parkflow</p>
            <p className="text-lg font-bold text-slate-900">Desktop</p>
          </div>
        )}
        {/* Toggle button integrado junto al logo */}
        <button
          onClick={onToggle}
          className={`
            p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all
            ${collapsed ? "hidden" : "flex"}
          `}
          aria-label="Colapsar sidebar"
          title="Colapsar sidebar"
        >
          <svg 
            className="w-5 h-5 transition-transform duration-300" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Toggle button (visible solo cuando está colapsado) */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="w-full flex justify-center p-2 mb-4 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          aria-label="Expandir sidebar"
          title="Expandir sidebar"
        >
          <svg 
            className="w-5 h-5 transition-transform duration-300 rotate-180" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Status indicator - condicional según configuración */}
      {uiSettings.showSystemStatus && (
        <div className={`
          mt-2 transition-all duration-300
          ${collapsed ? "px-1" : "px-2"}
        `}>
          <div className={`
            flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-lg
            ${collapsed ? "justify-center px-2 py-3" : "px-3 py-2"}
          `}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            {!collapsed && <span>Sistema operativo</span>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`
        mt-6 space-y-1 flex-1
        ${collapsed ? "px-1" : ""}
      `}>
        {visibleItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center rounded-xl font-medium transition-all
                ${active
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-600 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/35 hover:text-slate-900 dark:hover:text-white"}
                ${collapsed 
                  ? "justify-center p-3" 
                  : "justify-between px-3 py-3 text-sm gap-3"}
              `}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!collapsed && item.shortcut && (
                <kbd className={`
                  inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded flex-shrink-0
                  ${active 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-200 text-slate-500 dark:bg-neutral-800 dark:text-neutral-200"}
                `}>
                  {item.shortcut}
                </kbd>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help tip - condicional según configuración */}
      {!collapsed && uiSettings.showKeyboardShortcuts && (
        <div className="mt-auto pt-6 px-2">
              <div className="rounded-xl bg-slate-100/80 p-3 text-xs text-slate-600 dark:bg-zinc-900 dark:text-neutral-300">
             <p className="font-semibold mb-1">Atajos de teclado:</p>
             <div className="space-y-1 text-slate-500 dark:text-neutral-300">
               <p><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1 rounded">F1</kbd> Nuevo ingreso</p>
               <p><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1 rounded">F2</kbd> Salida/cobro</p>
               <p><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1 rounded">F3</kbd> Vehículos</p>
               <p><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1 rounded">F4</kbd> Caja</p>
               <p><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1 rounded">Esc</kbd> Dashboard</p>
             </div>
           </div>
        </div>
      )}
    </aside>
  );
}
