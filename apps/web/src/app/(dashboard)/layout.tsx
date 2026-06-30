import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import PrintQueueBootstrap from "@/components/print/PrintQueueBootstrap";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import { privateRouteMetadata } from "@/lib/seo/private-metadata";
import DashboardClientWrapper from "./DashboardClientWrapper";

export const metadata = privateRouteMetadata;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <PrintQueueBootstrap />
      <ThemeInitializer />
      <DashboardClientWrapper>
        {children}
      </DashboardClientWrapper>
    </AuthGate>
  );
}
