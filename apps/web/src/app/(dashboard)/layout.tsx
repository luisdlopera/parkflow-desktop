"use client";

import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import AuthGate from "@/components/auth/AuthGate";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import { useSidebar } from "@/lib/hooks/useSidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isOpen, isCollapsed, toggle, open, close } = useSidebar();

  return (
    <AuthGate>
      <div className="min-h-screen flex">
        <OnboardingGate />
        {/* Desktop/Tablet Sidebar */}
        <Sidebar collapsed={isCollapsed} onToggle={toggle} />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar isOpen={isOpen} onClose={close} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <Header onMenuClick={open} />
          <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-y-auto">
            <div className="surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
