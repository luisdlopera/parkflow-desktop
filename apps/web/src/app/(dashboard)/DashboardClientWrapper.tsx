"use client";

import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import { useSidebar } from "@/hooks/ui/useSidebar";
import { useCallback } from "react";
import { useUIFacade } from "@/features/admin/hooks/useUIFacade";

export default function DashboardClientWrapper({ children }: { children: ReactNode }) {
  const { isOpen, isCollapsed, toggle, open, close } = useSidebar();
  const { setSidebarState } = useUIFacade();

  const handleToggle = useCallback(() => {
    setSidebarState(isCollapsed ? "expanded" : "collapsed");
    toggle();
  }, [isCollapsed, toggle, setSidebarState]);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar collapsed={isCollapsed} onToggle={handleToggle} />
        <MobileSidebar isOpen={isOpen} onClose={close} />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header onMenuClick={open} />
          <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-y-auto overflow-x-hidden">
            <div className="surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
