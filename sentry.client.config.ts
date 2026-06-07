if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const Sentry = require("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch {
    // Sentry not installed — safe to ignore
  }
}
