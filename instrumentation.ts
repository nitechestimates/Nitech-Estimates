export async function register() {
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
      });
    } catch {
      // Sentry not installed — safe to ignore
    }
  }
}
