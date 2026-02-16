/**
 * Comprehensive error handling utilities for Meta API calls
 */

export interface ApiError {
  code?: number;
  message: string;
  type?: string;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class MetaApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public type?: string,
    public errorSubcode?: number,
    public fbtraceId?: string
  ) {
    super(message);
    this.name = "MetaApiError";
  }

  static fromError(error: ApiError | any): MetaApiError {
    if (error instanceof MetaApiError) {
      return error;
    }

    if (error.error) {
      return new MetaApiError(
        error.error.code || 500,
        error.error.message || "Unknown Meta API error",
        error.error.type,
        error.error.error_subcode,
        error.error.fbtrace_id
      );
    }

    return new MetaApiError(500, error.message || "Unknown error");
  }

  isRateLimitError(): boolean {
    return this.code === 4 || this.code === 17 || this.type === "OAuthException";
  }

  isTokenError(): boolean {
    return this.code === 190 || this.type === "OAuthException";
  }

  isPermissionError(): boolean {
    return this.code === 200 || this.errorSubcode === 2018001;
  }

  shouldRetry(): boolean {
    // Retry on rate limits, temporary errors, and network issues
    return (
      this.isRateLimitError() ||
      this.code === 1 || // Unknown error
      this.code === 2 || // Temporary service unavailable
      this.code === 4 || // Rate limit
      this.code === 17 || // User request limit
      this.code === 341 // Temporary API issue
    );
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    retryable?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    retryable = (error) => {
      // Retry on MetaApiError with retry flag
      if (error instanceof MetaApiError) {
        return error.shouldRetry();
      }
      // Also retry on common network errors
      const networkErrorPatterns = [
        "network",
        "timeout",
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "fetch failed",
        "Failed to fetch",
      ];
      const errorMessage = error.message.toLowerCase();
      return networkErrorPatterns.some((pattern) =>
        errorMessage.includes(pattern.toLowerCase())
      );
    },
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries || !retryable(lastError)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 0.3 * delay;
      const waitTime = Math.min(delay + jitter, maxDelay);

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      delay *= 2;
    }
  }

  throw lastError!;
}

/**
 * Rate limit handler
 */
export class RateLimitHandler {
  private rateLimitInfo: Map<string, { resetTime: number; remaining: number }> = new Map();

  updateRateLimit(key: string, resetTime: number, remaining: number) {
    this.rateLimitInfo.set(key, { resetTime, remaining });
  }

  getRateLimitInfo(key: string) {
    return this.rateLimitInfo.get(key);
  }

  async waitForRateLimit(key: string): Promise<void> {
    const info = this.rateLimitInfo.get(key);
    if (!info) return;

    const now = Date.now();
    if (info.resetTime > now && info.remaining <= 0) {
      const waitTime = info.resetTime - now;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

export const rateLimitHandler = new RateLimitHandler();

/**
 * Token refresh handler
 */
export async function refreshAccessToken(
  refreshToken: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${refreshToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new MetaApiError(
      error.error?.code || response.status,
      error.error?.message || "Failed to refresh token"
    );
  }

  return await response.json();
}

/**
 * Graceful error handler for API routes
 */
export function handleApiError(error: unknown): { error: string; status: number } {
  if (error instanceof MetaApiError) {
    return {
      error: error.message,
      status: error.code >= 400 && error.code < 600 ? error.code : 500,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      status: 500,
    };
  }

  return {
    error: "An unknown error occurred",
    status: 500,
  };
}

