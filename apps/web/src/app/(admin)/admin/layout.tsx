"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileSidebar } from "@/components/admin/AdminMobileSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useSidebar } from "@/lib/hooks/useSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, isCollapsed, toggle, open, close } = useSidebar();

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop/Tablet Sidebar */}
      <AdminSidebar collapsed={isCollapsed} onToggle={toggle} />

      {/* Mobile Sidebar Drawer */}
      <AdminMobileSidebar isOpen={isOpen} onClose={close} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AdminHeader onMenuClick={open} />
        <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-y-auto">
          <div className="surface grid-dots rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
