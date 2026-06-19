import type { Metadata } from "next";
import OfflineFeatureGate from "@/components/feedback/OfflineFeatureGate";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineFeatureGate>
      {children}
    </OfflineFeatureGate>
  );
}
