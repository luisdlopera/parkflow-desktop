import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useOperationSounds } from "../useOperationSounds";

describe("useOperationSounds", () => {
  let audioContextInstance: any;
  let AudioContextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    const createOscillator = vi.fn(() => ({
      connect: vi.fn(),
      frequency: { value: 0 },
      type: "",
      start: vi.fn(),
      stop: vi.fn(),
    }));
    const createGain = vi.fn(() => ({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }));
    const resume = vi.fn().mockResolvedValue(undefined);

    audioContextInstance = {
      createOscillator,
      createGain,
      destination: {},
      currentTime: 0,
      resume,
    };

    AudioContextMock = vi.fn(function AudioContextMock() {
      return audioContextInstance;
    });
    globalThis.AudioContext = AudioContextMock as any;
    (globalThis as any).webkitAudioContext = AudioContextMock as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates AudioContext lazily", () => {
    renderHook(() => useOperationSounds());
    expect(AudioContextMock).not.toHaveBeenCalled();
  });

  it("plays success sound with two sine beeps", () => {
    const { result } = renderHook(() => useOperationSounds());

    act(() => {
      result.current.playSuccess();
    });

    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(audioContextInstance.resume).toHaveBeenCalled();
    expect(audioContextInstance.createOscillator).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(audioContextInstance.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("plays error sound with a sawtooth beep", () => {
    const { result } = renderHook(() => useOperationSounds());

    act(() => {
      result.current.playError();
    });

    expect(audioContextInstance.createOscillator).toHaveBeenCalledTimes(1);
    const oscillator = audioContextInstance.createOscillator.mock.results[0].value;
    expect(oscillator.type).toBe("sawtooth");
  });

  it("plays warning sound with two square beeps", () => {
    const { result } = renderHook(() => useOperationSounds());

    act(() => {
      result.current.playWarning();
    });

    expect(audioContextInstance.createOscillator).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(audioContextInstance.createOscillator).toHaveBeenCalledTimes(2);
    const oscillator = audioContextInstance.createOscillator.mock.results[0].value;
    expect(oscillator.type).toBe("square");
  });

  it("plays click sound with a short high-frequency beep", () => {
    const { result } = renderHook(() => useOperationSounds());

    act(() => {
      result.current.playClick();
    });

    expect(audioContextInstance.createOscillator).toHaveBeenCalledTimes(1);
    const oscillator = audioContextInstance.createOscillator.mock.results[0].value;
    expect(oscillator.frequency.value).toBe(2000);
  });

  it("reuses the same AudioContext across multiple plays", () => {
    const { result } = renderHook(() => useOperationSounds());

    act(() => {
      result.current.playClick();
      result.current.playClick();
      result.current.playError();
    });

    expect(AudioContextMock).toHaveBeenCalledTimes(1);
  });
});
