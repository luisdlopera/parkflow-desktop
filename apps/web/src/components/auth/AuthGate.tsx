"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { currentUser, loadSession } from "@/lib/auth";
import { useSessionMonitor } from "@/lib/hooks/useSessionMonitor";
import { SessionExpiredModal } from "./SessionExpiredModal";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const { isExpired, renewSession } = useSessionMonitor();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const session = await loadSession();
      const user = await currentUser();
      if (!session || !user) {
        if (mounted) {
          router.replace(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
        }
        return;
      }
      if (mounted) {
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  // Mostrar modal cuando la sesión expira
  useEffect(() => {
    if (isExpired && ready) {
      setShowExpiredModal(true);
    }
  }, [isExpired, ready]);

  if (!ready) {
    return <div className="p-6 text-sm text-slate-600">Validando sesion...</div>;
  }

  return (
    <>
      {children}
      <SessionExpiredModal
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
        onRenew={renewSession}
      />
    </>
  );
}
