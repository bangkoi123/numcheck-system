import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      err: error,
      ...context,
    },
    error.message
  );
}

export function logInfo(message: string, context?: Record<string, any>) {
  logger.info(context, message);
}

export function logWarn(message: string, context?: Record<string, any>) {
  logger.warn(context, message);
}

export function logDebug(message: string, context?: Record<string, any>) {
  logger.debug(context, message);
}
