"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // Log to monitoring service (if configured)
    if (typeof window !== "undefined") {
      // Could send to Sentry, LogRocket, etc.
      console.error("[Error Report]", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="text-red-600" size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900">Something went wrong</h2>
              <p className="text-gray-500">
                An unexpected error occurred. Our team has been notified.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-gray-900 rounded-xl p-4 text-left overflow-auto max-h-48">
                <div className="flex items-center gap-2 text-red-400 text-xs font-mono mb-2">
                  <Bug size={14} />
                  <span>{this.state.error.name}</span>
                </div>
                <p className="text-red-300 text-sm font-mono break-words">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-gray-400 text-[10px] font-mono mt-2 whitespace-pre-wrap">
                    {this.state.error.stack.split("\n").slice(1, 5).join("\n")}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
              >
                <Home size={16} className="mr-2" />
                Go Home
              </Button>
            </div>

            <p className="text-xs text-gray-400">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for use in specific sections
 */
export function ChannelsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error("[Channels] Error:", error.message);
      }}
      fallback={
        <div className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mx-auto">
              <AlertTriangle className="text-amber-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Channel Error</h3>
            <p className="text-gray-500 text-sm">
              There was a problem loading your channels. Please refresh the page.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
