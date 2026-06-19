import OfflineFeatureGate from "@/components/feedback/OfflineFeatureGate";
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
