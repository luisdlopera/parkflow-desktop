"use client";

import { usePathname } from "next/navigation";
import OfflineFeatureGate from "@/components/feedback/OfflineFeatureGate";
import ConfigSidebar from "@/components/config/ConfigSidebar";

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMainPage = pathname === "/configuracion";

  return (
    <OfflineFeatureGate>
      {isMainPage ? (
        <div>{children}</div>
      ) : (
        <div className="space-y-8">
          <ConfigSidebar />
          {children}
        </div>
      )}
    </OfflineFeatureGate>
  );
}
