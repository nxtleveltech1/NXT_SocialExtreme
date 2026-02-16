"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-neutral-400 mb-6">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-neutral-600 mb-4 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={reset}
              className="bg-red-800 hover:bg-red-700 text-white"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => (window.location.href = "/")}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
