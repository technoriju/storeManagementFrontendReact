import { Env } from './env';

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (Env.isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (Env.isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, error?: any, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, error, ...args);
    // In production, integrate with crash reporting tool like Sentry or Crashlytics
  },
  debug: (message: string, ...args: any[]) => {
    if (Env.isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
