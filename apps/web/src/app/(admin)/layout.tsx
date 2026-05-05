import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import { SuperAdminGate } from "@/components/auth/SuperAdminGate";

export default function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGate>
      <SuperAdminGate>
        <div className="min-h-screen w-full flex flex-col bg-ash">{children}</div>
      </SuperAdminGate>
    </AuthGate>
  );
}