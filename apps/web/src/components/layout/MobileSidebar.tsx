"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useParkingShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import { useEffect, useState } from "react";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";
import { CONFIG_NAVIGATION } from "@/features/configuration/constants/navigation";
import { ChevronDown } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", shortcut: "", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Nuevo ingreso", href: "/nuevo-ingreso", shortcut: "F1", icon: "M12 4v16m8-8H4" },
  { label: "Vehiculos activos", href: "/vehiculos-activos", shortcut: "F3", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { label: "Salida y cobro", href: "/salida-cobro", shortcut: "F2", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Caja", href: "/caja", shortcut: "F4", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { label: "Reportes", href: "/reportes", shortcut: "", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Configuración", href: "/configuracion", shortcut: "", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  useParkingShortcuts();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [configView, setConfigView] = useState<string | false>(false);

  const authUser = useAuthStore((s) => s.user);
  const isAuditor = authUser?.role === "AUDITOR";

  const flags = useFeatureFlags();

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  // Sync configView with pathname to highlight active configuration submenu
  useEffect(() => {
    if (pathname.startsWith("/configuracion")) {
      setConfigView("ROOT");
    }
  }, [pathname]);

  const visibleItems = navItems.filter((item) => {
    if (item.href === "/caja") return flags.cash;
    return true;
  });

  const allNavItems = [...visibleItems];
  if (isAuditor) {
    allNavItems.push({
      label: "Auditoría",
      href: "/admin/audit",
      shortcut: "",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    });
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-default-100/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[280px] max-w-[85vw]
          border-r border-default-200/70 bg-[var(--color-sidebar)] dark:border-default-200/70 backdrop-blur-xl
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col px-4 py-6 pt-safe-area-inset-top" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
          {/* Header with close button */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand text-default-50 grid place-content-center font-bold text-lg border border-default-200">
                P
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-default-400">Parkflow</p>
                <p className="text-base font-bold text-foreground">Desktop</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-default-200 text-default-500 dark:text-default-400 dark:hover:bg-default-300"
              aria-label="Cerrar menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status indicator */}
          <div className="mt-6 px-2">
            <div className="flex items-center gap-2 text-xs text-default-500 dark:text-default-400 bg-default-100 dark:bg-default-800 rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistema operativo
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 space-y-1 flex-1">
            {allNavItems.map((item) => {
              const active = pathname === item.href;
              const isConfig = item.href === "/configuracion";
              const isConfigExpanded = configView && configView !== "ROOT";

              return (
                <div key={item.href}>
                  {isConfig ? (
                    <button
                      onClick={() => setConfigView(configView ? false : "ROOT")}
                      className={`
                        w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
                        ${configView
                          ? "bg-brand text-default-50 border border-default-200"
                          : "text-default-600 dark:text-default-400 hover:bg-default-200 dark:hover:bg-default-800 hover:text-foreground dark:hover:text-default-50"}
                      `}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                      <span>{item.label}</span>
                      <ChevronDown className={`ml-auto w-4 h-4 transition-transform ${configView ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
                        ${active
                          ? "bg-brand text-default-50 border border-default-200"
                          : "text-default-600 dark:text-default-400 hover:bg-default-200 dark:hover:bg-default-800 hover:text-foreground dark:hover:text-default-50"}
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
                             ? "bg-default-50 dark:bg-default-100/20 text-default-50"
                             : "bg-default-200 dark:bg-default-700 text-default-500 dark:text-default-400"}
                        `}>
                          {item.shortcut}
                        </kbd>
                      )}
                    </Link>
                  )}

                  {/* Config submenu */}
                  {isConfig && configView && (
                    <div className="mt-2 ml-2 space-y-1 border-l border-default-300/50 dark:border-default-600/50">
                      {CONFIG_NAVIGATION.map((group) => (
                        <div key={group.id}>
                          <p className="text-xs font-semibold text-default-500 uppercase px-3 py-1 tracking-wider">{group.label}</p>
                          {group.items.map((menuItem) => {
                            const isActive = pathname === menuItem.href;
                            return (
                              <Link
                                key={menuItem.href}
                                href={menuItem.href}
                                onClick={onClose}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all pl-4 ${
                                  isActive
                                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                                    : "text-default-600 dark:text-default-400 hover:bg-default-100 dark:hover:bg-default-800 hover:text-foreground dark:hover:text-default-50"
                                }`}
                              >
                                <span className={`w-1 h-1 rounded-full ${isActive ? "bg-brand-600 dark:bg-brand-400" : "bg-brand"}`} />
                                {menuItem.label}
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Help tip */}
          <div className="mt-auto pt-6 px-2">
            <div className="rounded-xl bg-default-100/80 p-3 text-xs text-default-600 dark:bg-default-200 dark:text-default-400">
              <p className="font-semibold mb-2">Atajos de teclado:</p>
              <div className="space-y-1.5 text-default-500">
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-default-50 dark:bg-default-100/80 dark:bg-default-200 px-1.5 py-0.5 rounded">F1</kbd> Nuevo ingreso</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-default-50 dark:bg-default-100/80 dark:bg-default-200 px-1.5 py-0.5 rounded">F2</kbd> Salida/cobro</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-default-50 dark:bg-default-100/80 dark:bg-default-200 px-1.5 py-0.5 rounded">F3</kbd> Vehículos</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-default-50 dark:bg-default-100/80 dark:bg-default-200 px-1.5 py-0.5 rounded">F4</kbd> Caja</span>
                </div>
                <div className="flex items-center justify-between">
                   <span><kbd className="font-mono bg-default-50 dark:bg-default-100/80 dark:bg-default-200 px-1.5 py-0.5 rounded">Esc</kbd> Dashboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
