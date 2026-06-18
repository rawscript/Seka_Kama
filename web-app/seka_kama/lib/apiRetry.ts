/**
 * API Retry Strategy with Exponential Backoff
 * Handles transient failures gracefully
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
  retryableStatusCodes?: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly lastAttempt: number,
    public readonly totalAttempts: number
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Calculate delay with exponential backoff + jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );

  const jitter =
    exponentialDelay * config.jitterFactor * Math.random();

  return Math.floor(exponentialDelay + jitter);
}

/**
 * Retry an async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable =
        attempt < finalConfig.maxRetries &&
        isRetryableError(error, finalConfig);

      if (!isRetryable) {
        throw error;
      }

      // Calculate and wait before retry
      const delayMs = calculateDelay(attempt, finalConfig);
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries + 1} failed. Retrying in ${delayMs}ms...`,
        error
      );

      await sleep(delayMs);
    }
  }

  // All retries exhausted
  throw new RetryableError(
    `Failed after ${finalConfig.maxRetries + 1} attempts: ${lastError?.message}`,
    finalConfig.maxRetries,
    finalConfig.maxRetries + 1
  );
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(
  error: unknown,
  config: RetryConfig
): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // HTTP errors
  if (error instanceof Response) {
    return config.retryableStatusCodes?.includes(error.status) ?? false;
  }

  // Check if error has status property
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error
  ) {
    const status = (error as any).status;
    return config.retryableStatusCodes?.includes(status) ?? false;
  }

  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Circuit Breaker pattern for cascading failure prevention
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly successThreshold = 2,
    private readonly timeout = 60000 // 1 minute
  ) {}

  async execute<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error(
          'Circuit breaker is open. Service temporarily unavailable.'
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = 'closed';
          this.failureCount = 0;
          this.successCount = 0;
        }
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        console.error(
          `[CircuitBreaker] Opened after ${this.failureCount} failures`
        );
      }

      throw error;
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}
