"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getUserFriendlyError, shouldReconnect, type UserFriendlyError } from "@/lib/utils/error-messages";
import { useRouter } from "next/navigation";

interface UseApiErrorOptions {
  showToast?: boolean;
  redirectOnAuth?: boolean;
}

interface UseApiErrorReturn {
  error: UserFriendlyError | null;
  isError: boolean;
  handleError: (error: unknown) => UserFriendlyError;
  clearError: () => void;
  withErrorHandling: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * Custom hook for centralized API error handling
 * 
 * Features:
 * - Converts raw errors to user-friendly messages
 * - Shows toast notifications
 * - Handles auth errors with redirect
 * - Provides wrapper for async operations
 * 
 * @example
 * const { handleError, withErrorHandling } = useApiError();
 * 
 * // Option 1: Manual handling
 * try {
 *   await fetch('/api/...');
 * } catch (err) {
 *   handleError(err);
 * }
 * 
 * // Option 2: Wrapped function
 * const result = await withErrorHandling(async () => {
 *   const res = await fetch('/api/...');
 *   return res.json();
 * });
 */
export function useApiError(options: UseApiErrorOptions = {}): UseApiErrorReturn {
  const { showToast = true, redirectOnAuth = false } = options;
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const router = useRouter();

  const handleError = useCallback(
    (rawError: unknown): UserFriendlyError => {
      const friendlyError = getUserFriendlyError(rawError);
      
      setError(friendlyError);

      // Show toast notification
      if (showToast) {
        toast.error(friendlyError.message, {
          description: friendlyError.action,
          action: friendlyError.link
            ? {
                label: "Fix it",
                onClick: () => router.push(friendlyError.link!),
              }
            : undefined,
        });
      }

      // Handle auth errors with redirect
      if (redirectOnAuth && shouldReconnect(rawError)) {
        router.push(friendlyError.link || "/channels");
      }

      // Log for debugging
      console.error("[API Error]", {
        original: rawError,
        friendly: friendlyError,
      });

      return friendlyError;
    },
    [showToast, redirectOnAuth, router]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      clearError();
      try {
        return await fn();
      } catch (err) {
        handleError(err);
        return undefined;
      }
    },
    [handleError, clearError]
  );

  return {
    error,
    isError: error !== null,
    handleError,
    clearError,
    withErrorHandling,
  };
}

/**
 * Type-safe API fetch with error handling
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: UserFriendlyError }> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.error || errorData.message || `HTTP ${response.status}`,
        ...errorData,
      };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    const error = getUserFriendlyError(err);
    return { error };
  }
}

export default useApiError;

