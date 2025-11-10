import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { apiLogger } from './logger';
import { pricing } from './pricing';

export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req: Request, res: Response) => {
      apiLogger.warn({
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      }, 'Rate limit exceeded');

      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
}

export const paymentRateLimit = createRateLimiter({
  windowMs: pricing.RATE_LIMITS.PAYMENT.windowMs,
  max: pricing.RATE_LIMITS.PAYMENT.max,
  message: 'Too many payment attempts, please try again later.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

export const budgetRateLimit = createRateLimiter({
  windowMs: pricing.RATE_LIMITS.BUDGET.windowMs,
  max: pricing.RATE_LIMITS.BUDGET.max,
  message: 'Too many budget operations, please try again later.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

export const generalRateLimit = createRateLimiter({
  windowMs: pricing.RATE_LIMITS.GENERAL.windowMs,
  max: pricing.RATE_LIMITS.GENERAL.max,
  message: 'Too many requests, please try again later.',
  skipSuccessfulRequests: true,
  skipFailedRequests: true
});

export const articleRateLimit = createRateLimiter({
  windowMs: pricing.RATE_LIMITS.ARTICLE.windowMs,
  max: pricing.RATE_LIMITS.ARTICLE.max,
  message: 'Too many article requests, please try again later.',
  skipSuccessfulRequests: true,
  skipFailedRequests: false
});