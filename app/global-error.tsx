"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#000319] text-white flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <p className="text-sm text-white-200">
            An unexpected error occurred. Please try refreshing or restoring the page.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-purple px-6 text-sm font-medium text-black transition-colors hover:bg-purple/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}