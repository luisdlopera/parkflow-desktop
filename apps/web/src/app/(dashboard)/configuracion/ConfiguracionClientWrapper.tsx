"use client";

import { usePathname } from "next/navigation";
import ConfigSidebar from "@/features/configuration/components/ui/ConfigSidebar";

export default function ConfiguracionClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMainPage = pathname === "/configuracion";

  return isMainPage ? (
    <div>{children}</div>
  ) : (
    <div className="space-y-8">
      <ConfigSidebar />
      {children}
    </div>
  );
}
