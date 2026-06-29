"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";
import { CONFIG_NAVIGATION } from "../../constants/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function ConfigSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const flags = useFeatureFlags();

  useEffect(() => {
    fetchRuntimeConfig().then(setRuntimeConfig).catch(() => setRuntimeConfig(null));
  }, []);

  const currentSection = searchParams.get("section");
  const groupParam = searchParams.get("group");

  const filteredGridGroups = useMemo(
    () =>
      CONFIG_NAVIGATION
        .filter((group) => !groupParam || group.id === groupParam)
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (item.flag === "cash") return flags.cash;
            if (item.flag === "lockers") return runtimeConfig?.operationConfiguration?.helmetHandling === "LOCKERS" || flags.lockers;
            if (item.flag === "agreements") return flags.agreements;
            if (item.flag === "prepaidPlans") return flags.prepaidPlans;
            return true;
          }),
        })).filter((group) => group.items.length > 0),
    [runtimeConfig, flags, groupParam]
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="mb-2">
        <Link
          href={groupParam ? "/configuracion" : "/"}
          className="inline-flex items-center gap-2 text-sm font-medium text-default-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {groupParam ? "Volver a categorías" : "Volver al inicio"}
        </Link>
      </motion.div>
      {filteredGridGroups.map((group) => (
        <motion.div key={group.id} variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <group.icon className="w-5 h-5 text-default-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-default-500">
              {group.label}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.items.map((item) => {
              const Icon = item.icon;
              const url = new URL(item.href, "http://localhost");
              const itemSection = url.searchParams.get("section");
              const isActive = itemSection 
                ? currentSection === itemSection 
                : (pathname === item.href && !currentSection);

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all hover:border-brand-400 dark:border-brand-900/60 hover:bg-brand-100 dark:bg-brand-900/30/30 ${
                    isActive
                      ? "border-brand-400 dark:border-brand-900/60 bg-brand-100 dark:bg-brand-900/30/50"
                      : "border-default-200 bg-default-50 dark:bg-default-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-brand-500 text-default-50"
                          : "bg-default-100 text-default-500 group-hover:bg-brand-200 dark:bg-brand-900/40 group-hover:text-brand-600 dark:text-brand-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        isActive ? "text-brand-900 dark:text-brand-50" : "text-default-700 group-hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                  <p className="text-xs text-default-500 leading-relaxed">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
