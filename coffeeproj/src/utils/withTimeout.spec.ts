import { withTimeout, TimeoutError } from './withTimeout';

const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
} => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the inner value when the promise wins', async () => {
    const inner = Promise.resolve(42);
    await expect(withTimeout(inner, 1000)).resolves.toBe(42);
  });

  it('rejects with TimeoutError when the timer wins', async () => {
    const d = deferred<string>();
    const racing = withTimeout(d.promise, 1000, 'getSession');
    jest.advanceTimersByTime(1000);
    await expect(racing).rejects.toBeInstanceOf(TimeoutError);
    await expect(racing).rejects.toThrow(/getSession/);
  });

  it('TimeoutError has name "TimeoutError" (so errorHandler classifies it)', async () => {
    const d = deferred<string>();
    const racing = withTimeout(d.promise, 500);
    jest.advanceTimersByTime(500);
    await expect(racing).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('clears the timer when the inner promise resolves first', async () => {
    const inner = Promise.resolve('ok');
    await withTimeout(inner, 5000);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('clears the timer when the inner promise rejects first', async () => {
    const inner = Promise.reject(new Error('boom'));
    await expect(withTimeout(inner, 5000)).rejects.toThrow('boom');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('propagates the inner rejection unchanged when inner rejects first', async () => {
    const innerErr = new Error('inner failure');
    await expect(withTimeout(Promise.reject(innerErr), 1000)).rejects.toBe(innerErr);
  });
});
