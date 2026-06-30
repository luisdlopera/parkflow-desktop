"use client";

import type { ReactNode } from "react";
import { useAuthBroadcast } from "@/hooks/auth/useAuthBroadcast";

/**
 * Client-side wrapper for the admin shell that subscribes to auth broadcast events.
 *
 * This ensures that when the user logs out in another tab (e.g., from the
 * dashboard), the admin panel also redirects to /login.
 */
export default function AdminClientWrapper({ children }: Readonly<{ children: ReactNode }>) {
  useAuthBroadcast();
  return <>{children}</>;
}
