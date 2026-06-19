"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/features/admin/AdminSidebar";
import { AdminMobileSidebar } from "@/features/admin/AdminMobileSidebar";
import { AdminHeader } from "@/features/admin/AdminHeader";
import { useSidebar } from "@/hooks/ui/useSidebar";

export default function AdminClientWrapper({ children }: { children: ReactNode }) {
  const { isOpen, isCollapsed, toggle, open, close } = useSidebar();

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AdminSidebar collapsed={isCollapsed} onToggle={toggle} />
        <AdminMobileSidebar isOpen={isOpen} onClose={close} />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <AdminHeader onMenuClick={open} />
          <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-y-auto">
            <div className="surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
