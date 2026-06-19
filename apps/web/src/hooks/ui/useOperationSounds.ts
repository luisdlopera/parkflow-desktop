"use client";

import { useCallback, useRef } from "react";

export function useOperationSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new Ctor();
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  const playBeep = useCallback((frequency: number, duration: number, type: OscillatorType = "sine") => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Silent fail
    }
  }, [getAudioContext]);

  const playSuccess = useCallback(() => {
    playBeep(880, 0.1, "sine");
    setTimeout(() => playBeep(1100, 0.2, "sine"), 100);
  }, [playBeep]);

  const playError = useCallback(() => {
    playBeep(220, 0.4, "sawtooth");
  }, [playBeep]);

  const playWarning = useCallback(() => {
    playBeep(440, 0.15, "square");
    setTimeout(() => playBeep(440, 0.15, "square"), 200);
  }, [playBeep]);

  const playClick = useCallback(() => {
    playBeep(2000, 0.03, "sine");
  }, [playBeep]);

  return {
    playSuccess,
    playError,
    playWarning,
    playClick
  };
}
