"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { currentUser, loadSession } from "@/lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return <div className="p-6 text-sm text-slate-600">Validando sesion...</div>;
  }

  return <>{children}</>;
}
