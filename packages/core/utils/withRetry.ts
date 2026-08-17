import { isRetryableError } from './errorHandler';

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a transient async operation with exponential backoff.
 *
 * Defaults: 3 attempts, delays 250ms / 500ms / 1000ms, retryable per
 * `errorHandler.isRetryableError` (network, 5xx, PGRST connection errors).
 *
 * Apply to idempotent reads (job feed, history, profile fetches). Do NOT apply
 * to writes with side effects (payment, mark-as-read, send-message) where the
 * retried call could double-write.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  const isRetryable = opts.isRetryable ?? isRetryableError;
  const sleep = opts.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = attempt === retries - 1;
      if (isLast || !isRetryable(error)) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
