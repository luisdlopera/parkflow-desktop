import type { Metadata } from "next";
import OfflineFeatureGate from "@/components/feedback/OfflineFeatureGate";

export const metadata: Metadata = { title: "Configuración" };
import ConfiguracionClientWrapper from "./ConfiguracionClientWrapper";

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineFeatureGate>
      <ConfiguracionClientWrapper>
        {children}
      </ConfiguracionClientWrapper>
    </OfflineFeatureGate>
  );
}
