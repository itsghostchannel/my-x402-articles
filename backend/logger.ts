import pino, { Logger, LoggerOptions } from 'pino';
import { config } from './config';

const isDevelopment = config.nodeEnv === 'development';

interface PrettyPrintOptions {
  colorize: boolean;
  translateTime: string;
  ignore: string;
  messageFormat: string;
}

const loggerConfig: LoggerOptions = {
  level: config.logLevel,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: isDevelopment ? [] : [
    'req.headers.authorization',
    'req.headers["x402-payer-pubkey"]',
    'user.wallet'
  ],
  base: {
    service: 'cms-x402-backend',
    environment: config.nodeEnv
  }
};

if (isDevelopment) {
  const transportOptions: PrettyPrintOptions = {
    colorize: true,
    translateTime: 'HH:MM:ss Z',
    ignore: 'pid,hostname',
    messageFormat: '{msg}'
  };

  (loggerConfig as any).transport = {
    target: 'pino-pretty',
    options: transportOptions
  };
}

export const logger: Logger = pino(loggerConfig);
export const paymentLogger = logger.child({ component: 'payment' });
export const budgetLogger = logger.child({ component: 'budget' });
export const apiLogger = logger.child({ component: 'api' });
export const articleLogger = logger.child({ component: 'article' });

export default logger;