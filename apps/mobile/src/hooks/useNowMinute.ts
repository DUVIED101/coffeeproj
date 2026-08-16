import { useEffect, useState } from 'react';

const MS_PER_MINUTE = 60_000;

type Listener = (now: number) => void;

let sharedTimer: ReturnType<typeof setInterval> | null = null;
let sharedNow = Date.now();
const listeners = new Set<Listener>();

const ensureTimer = (): void => {
  if (sharedTimer) return;
  sharedTimer = setInterval(() => {
    sharedNow = Date.now();
    listeners.forEach(l => l(sharedNow));
  }, MS_PER_MINUTE);
};

const releaseTimer = (): void => {
  if (listeners.size === 0 && sharedTimer) {
    clearInterval(sharedTimer);
    sharedTimer = null;
  }
};

export const useNowMinute = (): number => {
  const [now, setNow] = useState<number>(() => sharedNow);

  useEffect(() => {
    listeners.add(setNow);
    ensureTimer();
    setNow(sharedNow);
    return () => {
      listeners.delete(setNow);
      releaseTimer();
    };
  }, []);

  return now;
};
