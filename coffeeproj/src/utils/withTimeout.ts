export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const msg = label ? `${label} timed out after ${ms}ms` : `Operation timed out after ${ms}ms`;
      reject(new TimeoutError(msg));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
