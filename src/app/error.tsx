"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged to error boundary, no additional logging needed
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0e0f11] px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#e6e6e9] mb-4">Something went wrong</h1>
        <p className="text-[#8a8f98] mb-8">An unexpected error occurred. Please try again.</p>
        <button
          onClick={() => reset()}
          className="rounded-md bg-[#5e6ad2] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6e7ae2]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
