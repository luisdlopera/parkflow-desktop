"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";
import { CONFIG_NAVIGATION } from "../../constants/navigation";
import { motion } from "framer-motion";

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
      {filteredGridGroups.map((group) => (
        <motion.div key={group.id} variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <group.icon className="w-5 h-5 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
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
                  className={`group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all hover:border-primary-300 hover:bg-primary-50/30 ${
                    isActive
                      ? "border-primary-300 bg-primary-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-primary-500 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        isActive ? "text-primary-900" : "text-slate-700 group-hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
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
