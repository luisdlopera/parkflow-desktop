import { renderHook } from "@testing-library/react";
import { useOsShortcut } from "../useOsShortcut";

describe("useOsShortcut on macOS", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    });
  });

  it("detects macOS and returns Cmd modifier", () => {
    const { result } = renderHook(() => useOsShortcut());
    expect(result.current.isMac).toBe(true);
    expect(result.current.modifier).toBe("Cmd");
    expect(result.current.modifierSymbol).toBe("⌘");
  });
});

describe("useOsShortcut on non-Mac", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });
  });

  it("detects non-Mac and returns Ctrl modifier", () => {
    const { result } = renderHook(() => useOsShortcut());
    expect(result.current.isMac).toBe(false);
    expect(result.current.modifier).toBe("Ctrl");
    expect(result.current.modifierSymbol).toBe("Ctrl");
  });
});

describe("useOsShortcut on iOS", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });
  });

  it("detects iOS and returns Cmd modifier", () => {
    const { result } = renderHook(() => useOsShortcut());
    expect(result.current.isMac).toBe(true);
    expect(result.current.modifier).toBe("Cmd");
    expect(result.current.modifierSymbol).toBe("⌘");
  });
});

describe("useOsShortcut on Linux", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (X11; Linux x86_64)",
      configurable: true,
    });
  });

  it("detects Linux and returns Ctrl modifier", () => {
    const { result } = renderHook(() => useOsShortcut());
    expect(result.current.isMac).toBe(false);
    expect(result.current.modifier).toBe("Ctrl");
    expect(result.current.modifierSymbol).toBe("Ctrl");
  });
});
