"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/services/auth-storage.service";

export type AuthBroadcastEvent =
  | { type: "auth:login" }
  | { type: "auth:logout" }
  | { type: "auth:token_refreshed" };

const CHANNEL_NAME = "parkflow-auth-sync";

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/** Broadcast an auth event to all other open tabs. */
export function broadcastAuthEvent(event: AuthBroadcastEvent): void {
  getChannel()?.postMessage(event);
}

/**
 * Listens for auth events from other tabs.
 * On logout: clears session and redirects to /login.
 * On login: reloads to sync header/nav state.
 */
export function useAuthBroadcast(): void {
  const router = useRouter();

  useEffect(() => {
    const bc = getChannel();
    if (!bc) return;

    const handler = async (event: MessageEvent<AuthBroadcastEvent>) => {
      const { type } = event.data;

      if (type === "auth:logout") {
        await clearSession();
        router.push("/login");
      } else if (type === "auth:login") {
        router.refresh();
      } else if (type === "auth:token_refreshed") {
        // [Deuda] Another tab refreshed the token; trigger a soft refresh so
        // RSC data and headers reflect the updated session without redirecting.
        router.refresh();
      }
    };

    bc.addEventListener("message", handler);
    return () => bc.removeEventListener("message", handler);
  }, [router]);
}
