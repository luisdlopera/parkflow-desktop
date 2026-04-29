"use client";

import { useCallback, useRef } from "react";

/**
 * Hook para feedback sonoro en operaciones críticas.
 * Usa Web Audio API para generar beeps sin archivos externos.
 */
export function useOperationSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
      // Silent fail - audio no es crítico
    }
  }, [getAudioContext]);

  const playSuccess = useCallback(() => {
    // Dos beeps ascendentes: éxito
    playBeep(880, 0.1, "sine"); // A5
    setTimeout(() => playBeep(1100, 0.2, "sine"), 100); // C#6
  }, [playBeep]);

  const playError = useCallback(() => {
    // Beep grave largo: error
    playBeep(220, 0.4, "sawtooth"); // A3
  }, [playBeep]);

  const playWarning = useCallback(() => {
    // Beep medio doble: advertencia
    playBeep(440, 0.15, "square"); // A4
    setTimeout(() => playBeep(440, 0.15, "square"), 200);
  }, [playBeep]);

  const playClick = useCallback(() => {
    // Click muy corto y sutil
    playBeep(2000, 0.03, "sine");
  }, [playBeep]);

  return {
    playSuccess,
    playError,
    playWarning,
    playClick
  };
}
