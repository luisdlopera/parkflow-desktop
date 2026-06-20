"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import { Modal } from "@heroui/react";
import { Button } from "@/components/bridge/Button";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import { useSidebar } from "@/hooks/ui/useSidebar";
import { useUIFacade } from "@/features/admin/hooks/useUIFacade";
import { PageTransition } from "@/components/animations";
import { ScrollToTopButton } from "@/components/animations";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  return isOnline;
}

export default function DashboardClientWrapper({ children }: { children: ReactNode }) {
  const { isOpen, isCollapsed, toggle, open, close } = useSidebar();
  const { setSidebarState } = useUIFacade();
  const { warningVisible, secondsLeft, extend, doLogout } = useSessionTimeout(15);
  const isOnline = useOnlineStatus();

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
          {!isOnline && (
            <div className="bg-rose-600 text-white text-xs font-semibold text-center py-1.5 px-4 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
              Sin conexión — las operaciones se registrarán en cola y se sincronizarán al recuperar la red.
            </div>
          )}
          <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-y-auto overflow-x-hidden scroll-smooth">
            <PageTransition>
              <div className="surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 min-h-full">
                {children}
              </div>
            </PageTransition>
          </main>
        </div>
      </div>
      <ScrollToTopButton />

      {/* Session inactivity warning */}
      <Modal.Backdrop isOpen={warningVisible} onOpenChange={() => {}} isDismissable={false} isKeyboardDismissDisabled>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="text-xl font-bold">Sesión por expirar</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-700">{secondsLeft}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Tu sesión se cerrará en <strong>{secondsLeft} segundo{secondsLeft !== 1 ? "s" : ""}</strong> por inactividad.
                Haz clic en "Continuar" para seguir trabajando.
              </p>
            </Modal.Body>
            <Modal.Footer className="flex gap-3">
              <Button color="danger" variant="ghost" onPress={doLogout} className="flex-1">
                Cerrar sesión
              </Button>
              <Button color="primary" onPress={extend} className="flex-1">
                Continuar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
