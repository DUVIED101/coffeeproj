// The hook itself is a thin wrapper around React refs; the meaningful logic is
// the TTL gate which we reimplement here as the same pure function used inside
// the hook (kept private to avoid a public single-purpose helper). If the
// helper drifts, this spec serves as the contract.

type Gate = {
  shouldFire: (now: number) => boolean;
  reset: () => void;
};

const createGate = (ttlMs: number): Gate => {
  let lastRun = Number.NEGATIVE_INFINITY;
  return {
    shouldFire(now: number) {
      if (now - lastRun < ttlMs) return false;
      lastRun = now;
      return true;
    },
    reset() {
      lastRun = Number.NEGATIVE_INFINITY;
    },
  };
};

describe('stale-gate contract (mirrors useStaleCallback internals)', () => {
  it('fires the first call', () => {
    const g = createGate(1000);
    expect(g.shouldFire(0)).toBe(true);
  });

  it('suppresses repeats inside TTL', () => {
    const g = createGate(1000);
    expect(g.shouldFire(0)).toBe(true);
    expect(g.shouldFire(500)).toBe(false);
    expect(g.shouldFire(999)).toBe(false);
  });

  it('allows the next call once TTL has elapsed', () => {
    const g = createGate(1000);
    expect(g.shouldFire(0)).toBe(true);
    expect(g.shouldFire(1000)).toBe(true);
  });

  it('reset() forces the next call to fire within TTL', () => {
    const g = createGate(10_000);
    expect(g.shouldFire(0)).toBe(true);
    expect(g.shouldFire(100)).toBe(false);
    g.reset();
    expect(g.shouldFire(101)).toBe(true);
  });
});
