"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 animate-fade-in-up">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-10 text-center">
        {/* Warning icon */}
        <div className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border border-red-100">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          An unexpected error occurred. You can try again or return to the home
          page.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl shadow-sm transition active:scale-95 text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
