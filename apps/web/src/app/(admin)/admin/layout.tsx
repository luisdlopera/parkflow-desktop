import type { Metadata } from "next";
import OfflineFeatureGate from "@/components/feedback/OfflineFeatureGate";
import AdminClientWrapper from "./AdminClientWrapper";

export const metadata: Metadata = { title: "Administración" };

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
