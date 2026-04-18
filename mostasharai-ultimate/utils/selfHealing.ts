export interface RetryOptions {
  retries?: number; delayMs?: number;
  backoff?: 'fixed' | 'exponential';
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, delayMs = 500, backoff = 'exponential', onRetry } = options;
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (err) {
      lastError = err;
      if (i < retries) {
        const wait = backoff === 'exponential' ? delayMs * Math.pow(2, i) : delayMs;
        onRetry?.(i + 1, err);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw lastError;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export function circuitBreaker<T>(fn: (...args: any[]) => Promise<T>, options: { threshold?: number; timeout?: number } = {}) {
  const { threshold = 5, timeout = 10_000 } = options;
  let state: CircuitState = 'CLOSED';
  let failures = 0; let lastFailure = 0;
  return {
    async call(...args: any[]): Promise<T> {
      if (state === 'OPEN') {
        if (Date.now() - lastFailure >= timeout) state = 'HALF_OPEN';
        else throw new Error('Circuit breaker is OPEN');
      }
      try {
        const result = await fn(...args);
        if (state === 'HALF_OPEN') { failures = 0; state = 'CLOSED'; }
        return result;
      } catch (err) {
        failures++; lastFailure = Date.now();
        if (failures >= threshold || state === 'HALF_OPEN') state = 'OPEN';
        throw err;
      }
    },
    getState: () => state,
    reset: () => { state = 'CLOSED'; failures = 0; }
  };
}
