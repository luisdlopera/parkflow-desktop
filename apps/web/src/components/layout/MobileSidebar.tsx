"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParkingShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useEffect, useState } from "react";
import { fetchRuntimeConfig, shouldShowModule, type RuntimeConfig } from "@/lib/runtime-config";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/", shortcut: "", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Nuevo ingreso", href: "/nuevo-ingreso", shortcut: "F1", icon: "M12 4v16m8-8H4" },
  { label: "Vehiculos activos", href: "/vehiculos-activos", shortcut: "F3", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { label: "Salida y cobro", href: "/salida-cobro", shortcut: "F2", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Caja", href: "/caja", shortcut: "F4", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { label: "Configuración", href: "/configuracion", shortcut: "", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  useParkingShortcuts();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);

  const [configExpanded, setConfigExpanded] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/configuracion")) {
      setConfigExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  const visibleSubItems = [
    { label: "General", href: "/configuracion" },
    { label: "Sedes", href: "/configuracion/sedes" },
    { label: "Métodos de pago", href: "/configuracion/metodos-pago" },
    { label: "Impresoras", href: "/configuracion/impresoras" },
    { label: "Cajas", href: "/configuracion/cajas" },
    { label: "Operación", href: "/configuracion/operacion" },
    { label: "Fracciones", href: "/configuracion/fracciones" },
  ].filter((subItem) => {
    if (subItem.href === "/configuracion/sedes") {
      const sites = runtimeConfig?.sites;
      return Array.isArray(sites) ? sites.length > 1 : true;
    }
    if (subItem.href === "/configuracion/cajas") {
      return shouldShowModule(runtimeConfig, "cash", true);
    }
    return true;
  });

  const visibleItems = navItems.filter((item) => {
    if (item.href === "/caja") return shouldShowModule(runtimeConfig, "cash", true);
    return true;
  });

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[280px]
          border-r border-slate-200/70 bg-white/95 dark:bg-neutral-950/95 dark:border-neutral-800/70 backdrop-blur-xl
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col px-4 py-6">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500 text-white grid place-content-center font-bold text-lg shadow-lg shadow-orange-500/30">
                P
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Parkflow</p>
                <p className="text-base font-bold text-slate-900">Desktop</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              aria-label="Cerrar menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status indicator */}
          <div className="mt-6 px-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistema operativo
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 space-y-1 flex-1">
            {visibleItems.map((item) => {
              const isConfig = item.href === "/configuracion";
              const active = pathname === item.href || (isConfig && !!pathname?.startsWith("/configuracion"));

              if (isConfig) {
                return (
                  <div key={item.href} className="space-y-1">
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        setConfigExpanded(!configExpanded);
                      }}
                      className={`
                        w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
                        ${active
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800/35 dark:hover:text-white"}
                      `}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                      <span>{item.label}</span>
                      <svg
                        className={`w-4 h-4 ml-auto transition-transform duration-200 ${configExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>

                    <AnimatePresence initial={false}>
                      {configExpanded && (
                        <motion.div
                          initial="collapsed"
                          animate="open"
                          exit="collapsed"
                          variants={{
                            open: { opacity: 1, height: "auto", transition: { duration: 0.25, ease: "easeOut" } },
                            collapsed: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeIn" } }
                          }}
                          className="overflow-hidden pl-8 pr-1 mt-1 space-y-1 border-l-2 border-slate-200/50 dark:border-neutral-800/50 ml-5"
                        >
                          {visibleSubItems.map((subItem) => {
                            const subActive = pathname === subItem.href;
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={onClose}
                                className={`
                                  flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all
                                  ${subActive
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold"
                                    : "text-slate-500 dark:text-neutral-400 hover:bg-slate-100/70 dark:hover:bg-neutral-800/20 hover:text-slate-800 dark:hover:text-neutral-200"}
                                `}
                              >
                                {subItem.label}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
                    ${active
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800/35 dark:hover:text-white"}
                  `}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <kbd className={`
                      ml-auto inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded
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

          {/* Help tip */}
          <div className="mt-auto pt-6 px-2">
            <div className="rounded-xl bg-slate-100/80 p-3 text-xs text-slate-600 dark:bg-zinc-900 dark:text-neutral-300">
              <p className="font-semibold mb-2">Atajos de teclado:</p>
              <div className="space-y-1.5 text-slate-500">
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded">F1</kbd> Nuevo ingreso</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded">F2</kbd> Salida/cobro</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded">F3</kbd> Vehículos</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded">F4</kbd> Caja</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-white/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded">Esc</kbd> Dashboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
