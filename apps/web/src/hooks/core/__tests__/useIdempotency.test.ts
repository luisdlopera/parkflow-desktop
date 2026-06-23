import { renderHook } from "@testing-library/react";
import { useIdempotency } from "../useIdempotency";

describe("useIdempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getKey returns a key", () => {
    const { result } = renderHook(() => useIdempotency());
    const key = result.current.getKey();
    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
  });

  it("getKey returns a stable key between calls", () => {
    const { result } = renderHook(() => useIdempotency());
    const key1 = result.current.getKey();
    const key2 = result.current.getKey();
    expect(key1).toBe(key2);
  });

  it("getAndRotateKey returns a key and rotates", () => {
    const { result } = renderHook(() => useIdempotency());
    const key1 = result.current.getKey();
    const returnedKey = result.current.getAndRotateKey();
    expect(returnedKey).toBe(key1);

    const key2 = result.current.getKey();
    expect(key2).not.toBe(key1);
  });

  it("getAndRotateKey always returns a unique key on consecutive calls", () => {
    const { result } = renderHook(() => useIdempotency());
    const key1 = result.current.getAndRotateKey();
    const key2 = result.current.getAndRotateKey();
    const key3 = result.current.getAndRotateKey();

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
    expect(key1).not.toBe(key3);
  });

  it("getKey returns the latest key after rotation", () => {
    const { result } = renderHook(() => useIdempotency());
    const initial = result.current.getKey();
    result.current.getAndRotateKey();
    const afterRotate = result.current.getKey();

    expect(initial).not.toBe(afterRotate);
  });

  it("different hook instances have different keys", () => {
    const { result: result1 } = renderHook(() => useIdempotency());
    const { result: result2 } = renderHook(() => useIdempotency());

    expect(result1.current.getKey()).not.toBe(result2.current.getKey());
  });
});
