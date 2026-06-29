"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useParkingShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import { useState, useEffect } from "react";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";
import { useAuthStore } from "@/lib/stores/auth.store";
import { CONFIG_NAVIGATION } from "@/features/configuration/constants/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/", shortcut: "", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Nuevo ingreso", href: "/nuevo-ingreso", shortcut: "F1", icon: "M12 4v16m8-8H4" },
  { label: "Vehiculos activos", href: "/vehiculos-activos", shortcut: "F3", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { label: "Salida y cobro", href: "/salida-cobro", shortcut: "F2", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Caja", href: "/caja", shortcut: "F4", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { label: "Reportes", href: "/reportes", shortcut: "", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Auditoría", href: "/admin/audit", shortcut: "", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Configuración", href: "/configuracion", shortcut: "", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  useParkingShortcuts();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [configView, setConfigView] = useState<string | false>(false);
  const currentSection = searchParams.get("section");
  const flags = useFeatureFlags();
  const authUser = useAuthStore((s) => s.user);
  const isAuditor = authUser?.role === "AUDITOR";

  useEffect(() => {
    if (pathname?.startsWith("/configuracion")) {
      const currentSectionParams = searchParams.get("section");
      const currentGroupParams = searchParams.get("group");
      
      let matchedGroupId: string | null = null;

      if (currentGroupParams) {
        matchedGroupId = currentGroupParams;
      } else {
        for (const group of CONFIG_NAVIGATION) {
          for (const item of group.items) {
            try {
              const url = new URL(item.href, "http://localhost");
              const itemPath = url.pathname;
              const itemSection = url.searchParams.get("section");

              if (itemPath === pathname) {
                if (itemSection && currentSectionParams === itemSection) {
                  matchedGroupId = group.id;
                  break;
                } else if (!itemSection && (!currentSectionParams || itemPath !== "/configuracion")) {
                  matchedGroupId = group.id;
                  break;
                }
              }
            } catch (e) {}
          }
          if (matchedGroupId) break;
        }
      }

      if (matchedGroupId) {
        setConfigView((prev) => prev !== matchedGroupId ? matchedGroupId : prev);
      } else if (pathname === "/configuracion" && !currentSectionParams) {
        setConfigView((prev) => prev !== "ROOT" ? "ROOT" : prev);
      }
    } else {
      setConfigView(false);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

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

  const sidePad = collapsed ? "px-2" : "px-4";

  // Framer Motion variants for slide animation
  const slideVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
    exit: { opacity: 0, x: 10, transition: { duration: 0.2, ease: "easeIn" as const } },
  };

  const activeCategory = configView && configView !== "ROOT" 
    ? CONFIG_NAVIGATION.find(c => c.id === configView) 
    : null;

  return (
    <aside data-testid="desktop-sidebar" className={`
      hidden md:flex sticky top-0 z-20 h-screen border-r border-default-200 bg-[var(--color-sidebar)] backdrop-blur
      flex-col transition-all duration-300 ease-in-out
      ${collapsed ? "w-[72px]" : "w-[260px]"}
    `} style={{ paddingLeft: 'env(safe-area-inset-left)' }}>
      <div className={`flex-shrink-0 ${sidePad}`}>
        <div className={`
          flex items-center transition-all duration-300
          ${collapsed ? "py-6 justify-center gap-0" : "py-6 gap-3"}
        `}>
          <Link href="/" className={`flex items-center hover:opacity-80 transition-opacity ${collapsed ? "" : "gap-3 flex-1 overflow-hidden"}`}>
            <div className={`
              rounded-2xl bg-brand text-default-50 grid place-content-center font-bold border border-default-200 flex-shrink-0
              ${collapsed ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl"}
            `}>
              P
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-default-400">Parkflow</p>
                <p className="text-lg font-bold text-foreground">Desktop</p>
              </div>
            )}
          </Link>
          <button
            onClick={onToggle}
            className={`
              p-2 rounded-xl hover:bg-default-100 text-default-400 hover:text-default-600 dark:text-default-400 dark:hover:bg-default-200 dark:hover:text-default-500 transition-all
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className={`space-y-1 ${sidePad}`}>
          {collapsed && (
            <button
              onClick={onToggle}
              className="w-full flex justify-center p-2 mb-4 rounded-xl hover:bg-default-100 text-default-400 hover:text-default-600 dark:text-default-400 dark:hover:bg-default-200 dark:hover:text-default-500 transition-all"
              aria-label="Expandir sidebar"
              title="Expandir sidebar"
            >
              <svg className="w-5 h-5 transition-transform duration-300 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}

          <AnimatePresence mode="wait">
            {configView === "ROOT" && !collapsed && (
              <motion.div key="root-view" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-3">
                  <button
                    onClick={() => { setConfigView(false); router.push("/"); }}
                    aria-label="Volver al inicio"
                    className="flex items-center gap-2 text-xs font-semibold text-default-500 hover:text-default-800 transition-colors px-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al inicio
                  </button>

                  <div className="flex items-center gap-3 px-1">
                    <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={navItems[6].icon} />
                    </svg>
                    <span className="text-sm font-semibold text-foreground">Configuración</span>
                  </div>

                  <nav className="space-y-1">
                    {CONFIG_NAVIGATION.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setConfigView(group.id);
                          router.push(`/configuracion?group=${group.id}`);
                        }}
                        aria-label={`Ver opciones de ${group.label}`}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-all text-default-600 dark:text-default-300 hover:bg-default-200 dark:hover:bg-default-300 hover:text-default-900 dark:hover:text-default-50"
                      >
                        <div className="flex items-center gap-3">
                          <group.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                          <span>{group.label}</span>
                        </div>
                        <svg className="w-4 h-4 text-default-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </nav>
                </motion.div>
              )}

            {activeCategory && !collapsed && (
              <motion.div key="category-view" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-3">
                  <button
                    onClick={() => { setConfigView("ROOT"); router.push("/configuracion"); }}
                    aria-label="Volver a categorías"
                    className="flex items-center gap-2 text-xs font-semibold text-default-500 hover:text-default-800 transition-colors px-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a categorías
                  </button>

                  <div className="flex items-center gap-3 px-1">
                    <activeCategory.icon className="w-5 h-5 text-brand" />
                    <span className="text-sm font-semibold text-foreground">{activeCategory.label}</span>
                  </div>

                  <nav className="space-y-1">
                    {activeCategory.items.filter((item) => {
                      if (item.flag === "cash") return flags.cash;
                      if (item.flag === "lockers") return runtimeConfig?.operationConfiguration?.helmetHandling === "LOCKERS" || flags.lockers;
                      if (item.flag === "agreements") return flags.agreements;
                      if (item.flag === "prepaidPlans") return flags.prepaidPlans;
                      return true;
                    }).map((sub) => {
                      const url = new URL(sub.href, "http://localhost");
                      const itemSection = url.searchParams.get("section");
                      const subActive = itemSection 
                        ? currentSection === itemSection 
                        : (pathname === sub.href && !currentSection);

                      const Icon = sub.icon;
                      
                      return (
                        <Link
                          key={sub.key}
                          href={sub.href}
                          className={`
                            flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
                            ${subActive
                              ? "bg-brand text-default-50 border border-default-200"
                              : "text-default-600 dark:text-default-300 hover:bg-default-200 dark:hover:bg-default-300 hover:text-default-900 dark:hover:text-default-50"}
                          `}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </motion.div>
              )}

            {(!configView || collapsed) && (
              <motion.div key="main-nav" variants={slideVariants} initial="initial" animate="animate" exit="exit">
                  <nav className="space-y-1">
                    {allNavItems.map((item) => {
                      const active = pathname === item.href;
                      const isConfig = item.href === "/configuracion";

                      if (isConfig) {
                        return (
                          <div key={item.href}>
                            <button
                              onClick={() => {
                                setConfigView("ROOT");
                                router.push("/configuracion");
                              }}
                              className={`
                                w-full flex items-center rounded-xl font-medium transition-all border
                                ${pathname?.startsWith("/configuracion")
                                  ? "bg-brand text-default-50 border-default-200"
                                  : "text-default-600 dark:text-default-300 border-default-200 dark:border-default-700 hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40"}
                                ${collapsed ? "justify-center p-3" : "justify-between px-3 py-3 text-sm gap-3"}
                              `}
                              title={collapsed ? item.label : undefined}
                              aria-label={item.label}
                            >
                              <div className="flex items-center gap-3">
                                <svg className={`w-5 h-5 flex-shrink-0 ${collapsed ? "text-default-700 dark:text-gray-100" : "text-default-600 dark:text-gray-200"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                </svg>
                                {!collapsed && <span className="truncate">{item.label}</span>}
                              </div>
                              {!collapsed && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                            flex items-center rounded-xl font-medium transition-all border
                            ${active
                              ? "bg-brand text-default-50 border-default-200"
                              : "text-default-600 dark:text-default-300 border-default-200 dark:border-default-700 hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40"}
                            ${collapsed ? "justify-center p-3" : "justify-between px-3 py-3 text-sm gap-3"}
                          `}
                          title={collapsed ? item.label : undefined}
                          aria-label={item.label}
                        >
                          <div className="flex items-center gap-3">
                            <svg className={`w-5 h-5 flex-shrink-0 ${collapsed ? "text-default-700 dark:text-gray-100" : "text-default-600 dark:text-gray-200"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                            </svg>
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!collapsed && item.shortcut && (
                            <kbd className={`
                              inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded flex-shrink-0
                              ${active ? "bg-default-50 dark:bg-default-100/20 text-default-50" : "bg-default-200 text-default-500 dark:bg-gray-700 dark:text-gray-200"}
                            `} aria-hidden="true">
                              {item.shortcut}
                            </kbd>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
