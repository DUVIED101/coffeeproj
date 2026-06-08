import { runConnectivityProbe } from './connectivityProbe';

const ok = (status = 200): Response => ({ ok: status < 400, status }) as unknown as Response;

describe('runConnectivityProbe', () => {
  it('reports all targets reachable when all succeed', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(ok(200))) as unknown as typeof fetch;
    const report = await runConnectivityProbe({ fetchImpl });
    expect(report).toMatchObject({
      supabaseReachable: true,
      yandexReachable: true,
      appleReachable: true,
    });
    expect(report.results).toHaveLength(3);
    expect(report.results.every(r => r.ok)).toBe(true);
  });

  it('marks supabase unreachable when only supabase rejects, others unaffected', async () => {
    const fetchImpl = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('supabase.co')) return Promise.reject(new Error('Network request failed'));
      return Promise.resolve(ok(200));
    }) as unknown as typeof fetch;

    const report = await runConnectivityProbe({ fetchImpl });
    expect(report.supabaseReachable).toBe(false);
    expect(report.yandexReachable).toBe(true);
    expect(report.appleReachable).toBe(true);
    const supabaseResult = report.results.find(r => r.target === 'supabase');
    expect(supabaseResult).toMatchObject({ ok: false, errorMessage: 'Network request failed' });
  });

  it('treats a 5xx response as not reachable but does not throw', async () => {
    const fetchImpl = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('supabase.co')) return Promise.resolve(ok(503));
      return Promise.resolve(ok(200));
    }) as unknown as typeof fetch;

    const report = await runConnectivityProbe({ fetchImpl });
    expect(report.supabaseReachable).toBe(false);
    const r = report.results.find(x => x.target === 'supabase');
    expect(r).toMatchObject({ ok: false, status: 503 });
  });

  it('treats 401/403/404 as REACHABLE (server responded, only network counts)', async () => {
    const fetchImpl = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('supabase.co')) return Promise.resolve(ok(401));
      return Promise.resolve(ok(200));
    }) as unknown as typeof fetch;

    const report = await runConnectivityProbe({ fetchImpl });
    expect(report.supabaseReachable).toBe(true);
    const r = report.results.find(x => x.target === 'supabase');
    expect(r).toMatchObject({ ok: true, status: 401 });
  });

  it('records a TimeoutError when an endpoint hangs past the per-probe timeout', async () => {
    jest.useFakeTimers();
    let neverFetchResolve!: (v: Response) => void;
    const fetchImpl = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('supabase.co')) {
        return new Promise<Response>(res => {
          neverFetchResolve = res;
        });
      }
      return Promise.resolve(ok(200));
    }) as unknown as typeof fetch;

    const reportPromise = runConnectivityProbe({ fetchImpl, timeoutMs: 5000 });
    jest.advanceTimersByTime(5001);
    jest.useRealTimers();
    // release dangling reference
    neverFetchResolve(ok(200));

    const report = await reportPromise;
    expect(report.supabaseReachable).toBe(false);
    const r = report.results.find(x => x.target === 'supabase');
    expect(r).toMatchObject({ ok: false, errorName: 'TimeoutError' });
  });

  it('includes ISO timestamps for startedAt and finishedAt', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(ok(200))) as unknown as typeof fetch;
    const report = await runConnectivityProbe({ fetchImpl });
    expect(new Date(report.startedAt).toISOString()).toBe(report.startedAt);
    expect(new Date(report.finishedAt).toISOString()).toBe(report.finishedAt);
  });
});
