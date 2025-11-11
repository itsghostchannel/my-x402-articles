import pino, { Logger, LoggerOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const loggerConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: [],
  base: {
    service: 'atxp-mcp-server',
    environment: process.env.NODE_ENV || 'development'
  }
};

if (isDevelopment) {
  (loggerConfig as any).transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname,service,environment',
      messageFormat: '{service} {component} {msg}',
      levelFirst: true,
      singleLine: false
    }
  };
}

export const logger: Logger = pino(loggerConfig);
export const mcpLogger = logger.child({ component: 'mcp' });
export const paymentLogger = logger.child({ component: 'payment' });
export const budgetLogger = logger.child({ component: 'budget' });
export const apiLogger = logger.child({ component: 'api' });
export const articleLogger = logger.child({ component: 'article' });

export default logger;