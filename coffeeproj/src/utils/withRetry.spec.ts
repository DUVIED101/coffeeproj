jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import { withRetry } from './withRetry';

const networkError = (): Error => Object.assign(new Error('Network request failed'), {});
const authError = (): Error => Object.assign(new Error('Invalid login credentials'), {});

const noSleep = (): Promise<void> => Promise.resolve();

describe('withRetry', () => {
  it('returns the value on first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { sleep: noSleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient network errors then succeeds', async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce('eventual');
    const result = await withRetry(fn, { sleep: noSleep });
    expect(result).toBe('eventual');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors (auth, validation)', async () => {
    const fn = jest.fn<Promise<string>, []>().mockRejectedValue(authError());
    await expect(withRetry(fn, { sleep: noSleep })).rejects.toThrow('Invalid login credentials');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after `retries` attempts and throws the last error', async () => {
    const fn = jest.fn<Promise<string>, []>().mockRejectedValue(networkError());
    await expect(withRetry(fn, { retries: 3, sleep: noSleep })).rejects.toThrow(
      'Network request failed'
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('applies exponential backoff via injected sleep', async () => {
    const sleepDelays: number[] = [];
    const sleep = (ms: number) => {
      sleepDelays.push(ms);
      return Promise.resolve();
    };
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce('ok');
    await withRetry(fn, { sleep, baseDelayMs: 100 });
    expect(sleepDelays).toEqual([100, 200]);
  });

  it('honors a custom isRetryable predicate', async () => {
    const alwaysRetryable = () => true;
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(authError())
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { sleep: noSleep, isRetryable: alwaysRetryable });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
