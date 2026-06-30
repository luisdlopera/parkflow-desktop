import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import { SuperAdminGate } from "@/components/auth/SuperAdminGate";
import AdminClientWrapper from "./AdminClientWrapper";
import { privateRouteMetadata } from "@/lib/seo/private-metadata";

export const metadata: Metadata = {
  ...privateRouteMetadata,
  title: "Administración",
};

export default function AdminShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGate>
      <SuperAdminGate>
        <AdminClientWrapper>
          <div className="min-h-screen w-full flex flex-col bg-ash">{children}</div>
        </AdminClientWrapper>
      </SuperAdminGate>
    </AuthGate>
  );
}