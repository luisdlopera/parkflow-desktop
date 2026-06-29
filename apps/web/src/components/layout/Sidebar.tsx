"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useParkingShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import { useState, useEffect } from "react";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";
import { useAuthStore } from "@/lib/stores/auth.store";
import { CONFIG_NAVIGATION } from "@/features/configuration/constants/navigation";
import { NAV_ITEMS, useConfigView } from "@/lib/navigation";
import { ExpandableNavButton } from "./ExpandableNavButton";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  useParkingShortcuts();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const { configView, setConfigView } = useConfigView();
  const currentSection = searchParams.get("section");
  const flags = useFeatureFlags();
  const authUser = useAuthStore((s) => s.user);
  const isAuditor = authUser?.role === "AUDITOR";

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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={NAV_ITEMS[7].icon} />
                    </svg>
                    <span className="text-sm font-semibold text-foreground">Configuración</span>
                  </div>

                  <nav className="space-y-1">
                    {CONFIG_NAVIGATION.map((group) => (
                      <ExpandableNavButton
                        key={group.id}
                        label={group.label}
                        icon={<group.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
                        onClick={() => {
                          setConfigView(group.id);
                          router.push(`/configuracion?group=${group.id}`);
                        }}
                        collapsed={false}
                      />
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
                            flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all border
                            ${subActive
                              ? "bg-brand text-default-50 border-brand-400"
                              : "text-default-600 dark:text-default-300 border-transparent hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-default-900 dark:hover:text-default-50"}
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
                            <ExpandableNavButton
                              label={item.label}
                              icon={
                                <svg
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d={item.icon}
                                  />
                                </svg>
                              }
                              onClick={() => {
                                setConfigView("ROOT");
                                router.push("/configuracion");
                              }}
                              isActive={pathname?.startsWith("/configuracion")}
                              collapsed={collapsed}
                            />
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            flex items-center rounded-xl font-medium transition-all border group
                            ${active
                              ? "bg-brand text-default-50 border-brand-400"
                              : "text-default-600 dark:text-default-300 border-transparent hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40"}
                            ${collapsed ? "justify-center p-3" : "justify-between px-3 py-3 text-sm gap-3"}
                          `}
                          title={collapsed ? item.label : undefined}
                          aria-label={item.label}
                        >
                          <div className="flex items-center gap-3">
                            <svg className={`w-5 h-5 flex-shrink-0 transition-colors ${collapsed ? "text-default-700 dark:text-gray-100" : active ? "text-default-50" : "text-default-600 dark:text-gray-200 group-hover:text-brand-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                            </svg>
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!collapsed && item.shortcut && (
                            <kbd className={`
                              inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded flex-shrink-0 transition-colors
                              ${active ? "bg-default-50 dark:bg-default-100/20 text-default-50" : "bg-default-200 text-default-500 dark:bg-gray-700 dark:text-gray-200 group-hover:bg-brand-200 group-hover:text-brand-600"}
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
