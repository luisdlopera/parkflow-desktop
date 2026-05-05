"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Esta página redirige automáticamente a la sección de empresas.
 * Usamos un componente de cliente para evitar errores de timing ("negative time stamp")
 * en el entorno de desarrollo al usar el redirect() de servidor.
 */
export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/companies");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-slate-500">
      Cargando administración...
    </div>
  );
}
