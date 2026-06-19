import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import DashboardClientWrapper from "./DashboardClientWrapper";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <ThemeInitializer />
      <DashboardClientWrapper>
        {children}
      </DashboardClientWrapper>
    </AuthGate>
  );
}
