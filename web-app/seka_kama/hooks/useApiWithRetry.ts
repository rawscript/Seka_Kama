'use client';

import { useCallback, useRef } from 'react';
import { retryWithBackoff, CircuitBreaker, RetryConfig } from '@/lib/apiRetry';

/**
 * Hook: useApiWithRetry
 * Wraps API calls with automatic retry logic and circuit breaker pattern
 *
 * Usage:
 *   const { call, isLoading, error } = useApiWithRetry();
 *   const data = await call(() => fetch('/api/data'));
 */
export function useApiWithRetry(config?: Partial<RetryConfig>) {
  const circuitBreakerRef = useRef(new CircuitBreaker());

  const call = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      return retryWithBackoff(fn, config);
    },
    [config]
  );

  const callWithCircuitBreaker = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      return circuitBreakerRef.current.execute(async () => {
        return retryWithBackoff(fn, config);
      });
    },
    [config]
  );

  return {
    call,
    callWithCircuitBreaker,
    circuitBreakerState: circuitBreakerRef.current.getState(),
    resetCircuitBreaker: () => circuitBreakerRef.current.reset(),
  };
}
