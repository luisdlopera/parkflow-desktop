import { useRef, useCallback } from 'react';

export function useIdempotency() {
  const currentKey = useRef<string>(crypto.randomUUID());

  const getAndRotateKey = useCallback(() => {
    const key = currentKey.current;
    currentKey.current = crypto.randomUUID();
    return key;
  }, []);

  const getKey = useCallback(() => currentKey.current, []);

  return { getAndRotateKey, getKey };
}
