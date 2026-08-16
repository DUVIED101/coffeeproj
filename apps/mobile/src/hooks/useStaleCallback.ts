import { useCallback, useRef } from 'react';

/**
 * Wraps a callback so it no-ops when called again within `ttlMs` of the last
 * successful invocation. Use for refetches that fire on multiple triggers
 * (focus + AppState + pull-to-refresh) and would otherwise coalesce into a
 * burst of redundant network calls.
 *
 * Call `.reset()` to force the next invocation to fire regardless of TTL.
 */
type StaleCallback<T extends (...args: never[]) => void | Promise<void>> = T & {
  reset: () => void;
};

export function useStaleCallback<T extends (...args: never[]) => void | Promise<void>>(
  fn: T,
  ttlMs: number
): StaleCallback<T> {
  const lastRunRef = useRef<number>(Number.NEGATIVE_INFINITY);
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const wrapped = useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRunRef.current < ttlMs) return;
      lastRunRef.current = now;
      return fnRef.current(...args);
    }) as T,
    [ttlMs]
  );

  const reset = useCallback(() => {
    lastRunRef.current = Number.NEGATIVE_INFINITY;
  }, []);

  return Object.assign(wrapped, { reset });
}
