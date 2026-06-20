"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { hasPermission } from "@/features/auth/services/auth-domain.service";
import SalidaCobroClient from "./SalidaCobroClient";

export default function SalidaCobroPage() {
  const [canCobrar, setCanCobrar] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasPermission("cobros:registrar").then((allowed) => {
      if (!cancelled) setCanCobrar(allowed);
    });
    return () => { cancelled = true; };
  }, []);

  if (canCobrar === false) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Acceso denegado</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          No tienes permiso para registrar cobros de vehículos. Contacta al administrador si crees que esto es un error.
        </p>
      </div>
    );
  }

  return <SalidaCobroClient />;
}
