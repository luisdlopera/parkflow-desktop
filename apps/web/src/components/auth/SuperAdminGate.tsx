"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessSuperAdminPortal, currentUser } from "@/lib/auth";

export function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = await currentUser();
      if (cancelled) return;

      if (!user) {
        // Dejamos que AuthGate maneje la redirección a /login si no hay usuario
        return;
      }

      if (!canAccessSuperAdminPortal(user)) {
        console.warn("[SuperAdminGate] Access denied: User is not SUPER_ADMIN. Redirecting to /");
        router.replace("/");
        return;
      }
      setAllowed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Verificando acceso de administrador...
        </div>
      </div>
    );
  }

  if (allowed === false) {
    return null; // O un mensaje de acceso denegado antes de la redirección
  }

  return <>{children}</>;
}
