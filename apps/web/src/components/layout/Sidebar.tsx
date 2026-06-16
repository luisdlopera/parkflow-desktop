"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useParkingShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useState, useEffect } from "react";
import { fetchRuntimeConfig, shouldShowModule, type RuntimeConfig } from "@/lib/runtime-config";

const navItems = [
  { label: "Dashboard", href: "/", shortcut: "", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Nuevo ingreso", href: "/nuevo-ingreso", shortcut: "F1", icon: "M12 4v16m8-8H4" },
  { label: "Vehiculos activos", href: "/vehiculos-activos", shortcut: "F3", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { label: "Salida y cobro", href: "/salida-cobro", shortcut: "F2", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Caja", href: "/caja", shortcut: "F4", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { label: "Reportes", href: "/reportes", shortcut: "", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Configuración", href: "/configuracion", shortcut: "", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const CONFIG_SUBITEMS = [
  { key: "agreements", label: "Convenios", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" },
  { key: "prepaid", label: "Prepagados", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { key: "users", label: "Usuarios", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { key: "parameters", label: "Parámetros", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { key: "interface", label: "Interfaz", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" },
  { key: "onboarding", label: "Asistente Inicial", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { key: "masters", label: "Maestros", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { key: "espacios", label: "Espacios", href: "/configuracion/espacios", icon: "M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18" },
  { key: "lockers", label: "Lockers", href: "/configuracion/lockers", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
];

export default function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useParkingShortcuts();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [configView, setConfigView] = useState(false);
  const currentSection = searchParams.get("section") || "rates";

  useEffect(() => {
    if (!pathname?.startsWith("/configuracion")) {
      setConfigView(false);
    }
  }, [pathname]);

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  const visibleItems = navItems.filter((item) => {
    if (item.href === "/caja") return shouldShowModule(runtimeConfig, "cash", true);
    return true;
  });

  const sidePad = collapsed ? "px-2" : "px-4";

  return (
    <aside data-testid="desktop-sidebar" className={`
      hidden md:flex sticky top-0 z-20 h-screen border-r border-slate-200/70 bg-white/60 dark:bg-black/60 dark:border-gray-800/70 backdrop-blur
      flex-col transition-all duration-300 ease-in-out
      ${collapsed ? "w-[72px]" : "w-[260px]"}
    `}>
      <div className={`flex-shrink-0 ${sidePad}`}>
        <div className={`
          flex items-center gap-3 transition-all duration-300
          ${collapsed ? "py-6 justify-center" : "py-6"}
        `}>
          <div className={`
            rounded-2xl bg-orange-500 text-white grid place-content-center font-bold border border-default-200 -500/30
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
          <button
            onClick={onToggle}
            className={`
              p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-gray-800 dark:hover:text-slate-300 transition-all
              ${collapsed ? "hidden" : "flex"}
            `}
            aria-label="Colapsar sidebar"
            title="Colapsar sidebar"
          >
            <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={`space-y-1 ${sidePad}`}>
          {collapsed && (
            <button
              onClick={onToggle}
              className="w-full flex justify-center p-2 mb-4 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-gray-800 dark:hover:text-slate-300 transition-all"
              aria-label="Expandir sidebar"
              title="Expandir sidebar"
            >
              <svg className="w-5 h-5 transition-transform duration-300 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}

          {!collapsed && configView ? (
            /* Vista de configuración: botón volver + título + sub-items */
            <div className="space-y-3">
              <button
                onClick={() => setConfigView(false)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>

              <div className="flex items-center gap-3 px-1">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={navItems[6].icon} />
                </svg>
                <span className="text-sm font-semibold text-slate-800">Configuración</span>
              </div>

              <nav className="space-y-1">
                {CONFIG_SUBITEMS.map((sub) => {
                  const href = (sub as any).href || `/configuracion?section=${sub.key}`;
                  const subActive = (sub as any).href ? pathname === (sub as any).href : currentSection === sub.key;
                  return (
                    <Link
                      key={sub.key}
                      href={href}
                      className={`
                        flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
                        ${subActive
                          ? "bg-orange-500 text-white border border-default-200 -500/20"
                          : "text-slate-600 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white"}
                      `}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={sub.icon} />
                      </svg>
                      <span>{sub.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : (
            /* Vista normal: todos los items de navegación */
            <nav className="space-y-1">
              {visibleItems.map((item) => {
                const active = pathname === item.href;
                const isConfig = item.href === "/configuracion";

                if (isConfig) {
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => setConfigView(true)}
                        className={`
                          w-full flex items-center rounded-xl font-medium transition-all
                          ${pathname?.startsWith("/configuracion")
                            ? "bg-orange-500 text-white border border-default-200 -500/20"
                            : "text-slate-600 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white"}
                          ${collapsed ? "justify-center p-3" : "justify-between px-3 py-3 text-sm gap-3"}
                        `}
                        title={collapsed ? item.label : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                          </svg>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!collapsed && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center rounded-xl font-medium transition-all
                      ${active
                        ? "bg-orange-500 text-white border border-default-200 -500/20"
                        : "text-slate-600 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white"}
                      ${collapsed ? "justify-center p-3" : "justify-between px-3 py-3 text-sm gap-3"}
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
                        ${active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500 dark:bg-gray-700 dark:text-gray-200"}
                      `}>
                        {item.shortcut}
                      </kbd>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </aside>
  );
}
