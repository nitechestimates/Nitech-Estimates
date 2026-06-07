const isProd = process.env.NODE_ENV === "production";

export const logger = {
  info(message, meta = {}) {
    if (isProd) {
      console.log(JSON.stringify({ level: "info", timestamp: new Date().toISOString(), message, ...meta }));
    } else {
      console.log(`[INFO] ${new Date().toLocaleTimeString()} - ${message}`, Object.keys(meta).length ? meta : "");
    }
  },
  error(message, error, meta = {}) {
    const errMeta = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
    if (isProd) {
      console.error(JSON.stringify({ level: "error", timestamp: new Date().toISOString(), message, ...errMeta, ...meta }));
    } else {
      console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${message}`, error, Object.keys(meta).length ? meta : "");
    }
  },
  warn(message, meta = {}) {
    if (isProd) {
      console.log(JSON.stringify({ level: "warn", timestamp: new Date().toISOString(), message, ...meta }));
    } else {
      console.warn(`[WARN] ${new Date().toLocaleTimeString()} - ${message}`, Object.keys(meta).length ? meta : "");
    }
  }
};
