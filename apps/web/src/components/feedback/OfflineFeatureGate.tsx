"use client";
import { Spinner } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, ArrowLeft, Home } from "lucide-react";
import { motion } from "framer-motion";
import { isLocalFirstMode } from "@/lib/local-first/config";

interface OfflineFeatureGateProps {
  children: React.ReactNode;
}

export default function OfflineFeatureGate({ children }: OfflineFeatureGateProps) {
  const router = useRouter();
  const [isLocal, setIsLocal] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isLocalFirstMode()
      .then((val) => {
        if (active) setIsLocal(val);
      })
      .catch(() => {
        if (active) setIsLocal(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Loading state
  if (isLocal === null) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
        <Spinner color="warning" size="lg" />
        <p className="text-sm font-medium text-slate-500 dark:text-neutral-400 animate-pulse">
          Verificando disponibilidad de la función...
        </p>
      </div>
    );
  }

  // If we are in standard cloud mode, render children normally
  if (!isLocal) {
    return <>{children}</>;
  }

  // If in local/offline mode, render the "Function Not Available" screen
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <Card className="border border-amber-200/50 bg-white/70 dark:bg-neutral-900/60 dark:border-neutral-800/50 backdrop-blur-md border border-default-200 rounded-3xl overflow-hidden">
          <Card.Content className="p-8 sm:p-10 flex flex-col items-center text-center">
            {/* Animated Icon Container */}
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-white border border-default-200"
            >
              <CloudOff size={38} className="animate-pulse" />
            </motion.div>

            {/* Title */}
            <h2 className="mb-3 text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
              Función no disponible
            </h2>

            {/* Subtitle / Mode info badge */}
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Versión Local-First / Offline
            </span>

            {/* Description */}
            <p className="mb-8 text-sm sm:text-base leading-relaxed text-slate-500 dark:text-neutral-400 max-w-sm">
              Para garantizar la integridad y sincronización de los datos, la edición de tarifas, creación de usuarios y demás configuraciones administrativas deben realizarse directamente en la plataforma en la nube (versión online).
            </p>

            {/* Interactive Actions */}
            <div className="flex w-full flex-col sm:flex-row gap-3 justify-center">
              <Button
                id="offline-gate-back-btn"
                color="warning"
                variant="border border-default-200"
                size="lg"
                startContent={<ArrowLeft size={18} />}
                onPress={() => router.back()}
                className="font-bold text-white border border-default-200 -500/20"
              >
                Volver
              </Button>
              <Button
                id="offline-gate-dashboard-btn"
                variant="tertiary"
                color="default"
                size="lg"
                startContent={<Home size={18} />}
                onPress={() => router.push("/")}
                className="font-semibold text-slate-700 dark:text-neutral-200"
              >
                Dashboard
              </Button>
            </div>
          </Card.Content>
        </Card>
      </motion.div>
    </div>
  );
}
