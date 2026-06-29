"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useParkingShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import { useEffect, useState } from "react";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";
import { CONFIG_NAVIGATION } from "@/features/configuration/constants/navigation";
import { NAV_ITEMS, useConfigView } from "@/lib/navigation";
import { ExpandableNavButton } from "./ExpandableNavButton";
import { ChevronDown } from "lucide-react";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  useParkingShortcuts();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const { configView, setConfigView } = useConfigView();

  const authUser = useAuthStore((s) => s.user);
  const isAuditor = authUser?.role === "AUDITOR";

  const flags = useFeatureFlags();

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => {
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
            {/* Main nav items (hidden when in config view) */}
            {!configView && (
              <>
                {allNavItems.map((item) => {
                  const active = pathname === item.href;
                  const isConfig = item.href === "/configuracion";

                  return (
                    <div key={item.href}>
                      {isConfig ? (
                        <ExpandableNavButton
                          label={item.label}
                          icon={
                            <svg
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d={item.icon}
                              />
                            </svg>
                          }
                          onClick={() => setConfigView("ROOT")}
                          isActive={active}
                        />
                      ) : (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`
                            flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all border group
                            ${active
                              ? "bg-brand text-default-50 border-brand-400"
                              : "text-default-600 dark:text-default-400 border-transparent hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-foreground dark:hover:text-default-50"}
                          `}
                        >
                          <svg className={`w-5 h-5 flex-shrink-0 transition-colors ${active ? "text-default-50" : "group-hover:text-brand-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                          </svg>
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <kbd className={`
                              ml-auto inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors
                             ${active
                                 ? "bg-default-50 dark:bg-default-100/20 text-default-50"
                                 : "bg-default-200 dark:bg-default-700 text-default-500 dark:text-default-400 group-hover:bg-brand-200 group-hover:text-brand-600"}
                            `}>
                              {item.shortcut}
                            </kbd>
                          )}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Config submenu (shown when in config view) */}
            {configView === "ROOT" && (
              <div className="space-y-3">
                <button
                  onClick={() => setConfigView(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-default-500 hover:text-default-800 dark:hover:text-default-200 transition-colors px-1 mb-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver al inicio
                </button>

                <div className="flex items-center gap-3 px-1">
                  <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-foreground">Configuración</span>
                </div>

                <nav className="space-y-1">
                  {CONFIG_NAVIGATION.map((group) => (
                    <ExpandableNavButton
                      key={group.id}
                      label={group.label}
                      icon={<group.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
                      onClick={() => setConfigView(group.id)}
                    />
                  ))}
                </nav>
              </div>
            )}

            {/* Category items (shown when a specific category is expanded) */}
            {configView && configView !== "ROOT" && (
              <div className="space-y-3">
                <button
                  onClick={() => setConfigView("ROOT")}
                  className="flex items-center gap-2 text-xs font-semibold text-default-500 hover:text-default-800 dark:hover:text-default-200 transition-colors px-1 mb-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a categorías
                </button>

                {CONFIG_NAVIGATION.map((group) => {
                  if (group.id !== configView) return null;

                  return (
                    <div key={group.id}>
                      <div className="flex items-center gap-3 px-1">
                        <group.icon className="w-5 h-5 text-brand" />
                        <span className="text-sm font-semibold text-foreground">{group.label}</span>
                      </div>

                      <nav className="space-y-1 mt-2">
                        {group.items
                          .filter((item) => {
                            if (item.flag === "cash") return flags.cash;
                            if (item.flag === "lockers") return runtimeConfig?.operationConfiguration?.helmetHandling === "LOCKERS" || flags.lockers;
                            if (item.flag === "agreements") return flags.agreements;
                            if (item.flag === "prepaidPlans") return flags.prepaidPlans;
                            return true;
                          })
                          .map((menuItem) => {
                            const isActive = pathname === menuItem.href;
                            const Icon = menuItem.icon;
                            return (
                              <Link
                                key={menuItem.href}
                                href={menuItem.href}
                                onClick={onClose}
                                className={`
                                  flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all border
                                  ${isActive
                                    ? "bg-brand text-default-50 border-brand-400"
                                    : "text-default-600 dark:text-default-300 border-transparent hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-default-900 dark:hover:text-default-50"}
                                `}
                              >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span>{menuItem.label}</span>
                              </Link>
                            );
                          })}
                      </nav>
                    </div>
                  );
                })}
              </div>
            )}
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
