/**
 * User-friendly error messages for common API errors
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  link?: string;
}

// Meta API error code mappings
const META_ERROR_CODES: Record<number, UserFriendlyError> = {
  // OAuth Errors
  190: {
    title: "Session Expired",
    message: "Your Facebook/Instagram session has expired.",
    action: "Please reconnect your account to continue.",
    link: "/channels",
  },
  // Permission Errors
  200: {
    title: "Permission Denied",
    message: "The app doesn't have permission to perform this action.",
    action: "Please grant the required permissions when reconnecting.",
    link: "/channels",
  },
  // Rate Limiting
  4: {
    title: "Too Many Requests",
    message: "You've made too many requests. Please wait a moment.",
    action: "The request will automatically retry in a few seconds.",
  },
  17: {
    title: "Rate Limit Reached",
    message: "You've reached the API rate limit for this hour.",
    action: "Try again in about 15 minutes.",
  },
  // General Errors
  1: {
    title: "Unknown Error",
    message: "An unknown error occurred with the Meta API.",
    action: "Please try again. If the problem persists, contact support.",
  },
  2: {
    title: "Service Unavailable",
    message: "Meta's servers are temporarily unavailable.",
    action: "Please wait a few minutes and try again.",
  },
  // Business Account Errors
  100: {
    title: "Invalid Request",
    message: "The request to Meta was invalid.",
    action: "Please check your input and try again.",
  },
  // Access Errors
  10: {
    title: "Permission Error",
    message: "You don't have permission to access this resource.",
    action: "Make sure you're using a Business account with the correct permissions.",
  },
};

// HTTP status code mappings
const HTTP_STATUS_MESSAGES: Record<number, UserFriendlyError> = {
  400: {
    title: "Invalid Request",
    message: "The request was invalid. Please check your input.",
    action: "Review the data you entered and try again.",
  },
  401: {
    title: "Authentication Required",
    message: "You need to be logged in to perform this action.",
    action: "Please log in and try again.",
    link: "/login",
  },
  403: {
    title: "Access Denied",
    message: "You don't have permission to perform this action.",
    action: "Contact your administrator if you need access.",
  },
  404: {
    title: "Not Found",
    message: "The requested resource could not be found.",
    action: "Check the URL or navigate back to the dashboard.",
  },
  429: {
    title: "Too Many Requests",
    message: "You're sending requests too quickly.",
    action: "Please wait a moment before trying again.",
  },
  500: {
    title: "Server Error",
    message: "Something went wrong on our end.",
    action: "Please try again. If the problem persists, contact support.",
  },
  502: {
    title: "Gateway Error",
    message: "We couldn't connect to the required services.",
    action: "Please try again in a few minutes.",
  },
  503: {
    title: "Service Unavailable",
    message: "The service is temporarily unavailable.",
    action: "Please try again in a few minutes.",
  },
  504: {
    title: "Request Timeout",
    message: "The request took too long to complete.",
    action: "Please try again with a smaller data set.",
  },
};

// Common error message patterns
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  error: UserFriendlyError;
}> = [
  {
    pattern: /token.*expired|session.*expired/i,
    error: {
      title: "Session Expired",
      message: "Your login session has expired.",
      action: "Please reconnect your account.",
      link: "/channels",
    },
  },
  {
    pattern: /network|fetch.*failed|connection/i,
    error: {
      title: "Connection Error",
      message: "Unable to connect to the server.",
      action: "Check your internet connection and try again.",
    },
  },
  {
    pattern: /timeout|timed out/i,
    error: {
      title: "Request Timeout",
      message: "The request took too long to complete.",
      action: "Please try again.",
    },
  },
  {
    pattern: /invalid.*token|unauthorized/i,
    error: {
      title: "Authentication Error",
      message: "Your credentials are invalid or have expired.",
      action: "Please reconnect your account.",
      link: "/channels",
    },
  },
  {
    pattern: /permission.*denied|access.*denied/i,
    error: {
      title: "Permission Denied",
      message: "You don't have permission to perform this action.",
      action: "Make sure your account has the required permissions.",
    },
  },
  {
    pattern: /not.*found/i,
    error: {
      title: "Not Found",
      message: "The requested item could not be found.",
      action: "It may have been deleted or moved.",
    },
  },
];

/**
 * Convert a raw error into a user-friendly error message
 */
export function getUserFriendlyError(
  error: unknown,
  defaultMessage = "An unexpected error occurred"
): UserFriendlyError {
  // Handle Meta API errors with error codes
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    
    // Check for Meta-specific error structure
    if (err.code && META_ERROR_CODES[err.code]) {
      return META_ERROR_CODES[err.code];
    }
    
    // Check HTTP status codes
    if (err.status && HTTP_STATUS_MESSAGES[err.status]) {
      return HTTP_STATUS_MESSAGES[err.status];
    }
  }

  // Get error message string
  let message = defaultMessage;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (typeof error === "object" && error !== null) {
    const err = error as any;
    message = err.message || err.error || defaultMessage;
  }

  // Match against known patterns
  for (const { pattern, error: friendlyError } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return friendlyError;
    }
  }

  // Return a generic friendly error
  return {
    title: "Error",
    message: message,
    action: "Please try again. If the problem persists, contact support.",
  };
}

/**
 * Format an error for display in toast notifications
 */
export function formatErrorForToast(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return `${friendly.title}: ${friendly.message}`;
}

/**
 * Check if an error should trigger a reconnection flow
 */
export function shouldReconnect(error: unknown): boolean {
  const friendly = getUserFriendlyError(error);
  return friendly.link === "/channels";
}

