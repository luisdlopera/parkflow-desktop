import OfflineFeatureGate from "@/components/feedback/OfflineFeatureGate";
import AdminClientWrapper from "./AdminClientWrapper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OfflineFeatureGate>
      <AdminClientWrapper>
        {children}
      </AdminClientWrapper>
    </OfflineFeatureGate>
  );
}
