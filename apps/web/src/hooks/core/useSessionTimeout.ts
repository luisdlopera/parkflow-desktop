"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { createAuthProvider } from "@/auth/runtime/createAuthProvider";
import { clearSession } from "@/lib/services/auth-storage.service";

const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

export function useSessionTimeout(idleMinutes = 15) {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const idleMs = idleMinutes * 60 * 1000;
  const warnMs = 60 * 1000;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const doLogout = useCallback(() => {
    setWarningVisible(false);
    void (async () => {
      try {
        await (await createAuthProvider()).logout();
      } finally {
        logout();
        await clearSession();
        router.replace("/login?reason=inactivity");
      }
    })();
  }, [logout, router]);

  const resetTimers = useCallback(() => {
    if (!isAuthenticated) return;

    setWarningVisible(false);
    setSecondsLeft(60);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    warnTimerRef.current = setTimeout(() => {
      setWarningVisible(true);
      setSecondsLeft(60);
      let remaining = 60;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, idleMs - warnMs);

    timerRef.current = setTimeout(doLogout, idleMs);
  }, [isAuthenticated, idleMs, warnMs, doLogout]);

  const extend = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!isAuthenticated) return;

    resetTimers();

    const onActivity = () => resetTimers();
    IDLE_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    return () => {
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isAuthenticated, resetTimers]);

  return { warningVisible, secondsLeft, extend, doLogout };
}
